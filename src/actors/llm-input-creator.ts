import { Actor } from 'apify';

interface ActorInput {
    actorTechnicalName: string;
}

interface BaseTestInput {
    maxItems?: number;
    resultsLimit?: number;
    resultsPerPage?: number;
    startUrls?: string[];
    searchTerms?: string[];
    placeIds?: string[];
    includeVideoDetails?: boolean;
    includeComments?: boolean;
    includeStats?: boolean;
    shouldDownloadVideos?: boolean;
    shouldDownloadCovers?: boolean;
    shouldDownloadSubtitles?: boolean;
    proxy?: {
        useApifyProxy?: boolean;
        apifyProxyGroups?: string[];
        apifyProxyCountry?: string;
    };
    proxyConfiguration?: {
        useApifyProxy?: boolean;
        apifyProxyGroups?: string[];
        apifyProxyCountry?: string;
    };
    extendOutputFunction?: string;
    customMapFunction?: string;
    [key: string]: any; // Allow for additional dynamic properties
}

interface TestInputConfig {
    minimalInput: BaseTestInput;
    normalInput: BaseTestInput;
    maximalInput: BaseTestInput;
    edgeInput: BaseTestInput;
    targetActorId: string;
}

// Centralized error handling utility
function handleError(context: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}:`, message);
    throw new Error(`${context}: ${message}`);
}

export class LLMInputCreator {
    async generateTestInputs(actorTechnicalName: string, feedback?: string): Promise<TestInputConfig> {
        const prompt = this.createPrompt(actorTechnicalName, feedback);
        
        console.log('Calling OpenRouter standby service...');
        
        try {
            const response = await fetch('https://openrouter.apify.actor/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.APIFY_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    model: 'anthropic/claude-sonnet-4',
                    temperature: 0
                })
            });

            console.log('OpenRouter response received');

            if (!response.ok) {
                handleError('OpenRouter API request failed', `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || !data.choices || !data.choices[0]?.message?.content) {
                handleError('OpenRouter response validation failed', 'Invalid response structure from OpenRouter service');
            }

            const content = data.choices[0].message.content;
            console.log('Parsing JSON response...');
            console.log('Raw response content:', content);

            // Extract JSON from code block (model consistently returns JSON in ```json blocks)
            const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (!jsonMatch) {
                handleError('JSON extraction failed', 'No JSON found in OpenRouter response');
            }

            console.log('Extracted JSON:', jsonMatch[0]);
            
            // Clean up the JSON string - remove any trailing characters
            let jsonString = jsonMatch[1].trim();
            
            // Try to find the end of the JSON object
            let braceCount = 0;
            let endIndex = -1;
            for (let i = 0; i < jsonString.length; i++) {
                if (jsonString[i] === '{') braceCount++;
                if (jsonString[i] === '}') braceCount--;
                if (braceCount === 0) {
                    endIndex = i;
                    break;
                }
            }
            
            if (endIndex !== -1) {
                jsonString = jsonString.substring(0, endIndex + 1);
            }
            
            console.log('Cleaned JSON:', jsonString);
            const testConfigs = JSON.parse(jsonString);
            
            // Validate the response structure
            if (!testConfigs.minimalInput || !testConfigs.normalInput || 
                !testConfigs.maximalInput || !testConfigs.edgeInput || 
                !testConfigs.targetActorId) {
                handleError('Response validation failed', 'Invalid JSON structure in response - missing required fields');
            }

            return testConfigs;

        } catch (error) {
            handleError('OpenRouter service call failed', error);
        }
    }

    private createPrompt(actorTechnicalName: string, feedback?: string): string {
        const feedbackSection = feedback ? `

**IMPORTANT - PREVIOUS ATTEMPT FEEDBACK:**
${feedback}

Please address these specific issues in your new input generation.` : '';

        return `Use the following steps with ${actorTechnicalName}:${feedbackSection}
Step 1: Get Actor Details Use the get-actor-details tool to understand the Actor and its complete input schema:

Actor description and purpose
Full input schema with all parameters
Parameter types, requirements, and constraints
Default values and examples

Step 2: Analyze Input Schema Thoroughly analyze the input schema to identify:

Required parameters
Optional parameters
Parameter types (string, number, boolean, array, object)
Enum values and constraints
Default values and examples

Step 3: Create 4 Test Input Configurations Design 4 different input configurations to exercise the Actor comprehensively. DO NOT run the Actor - only prepare the input objects:

**GENERIC INPUT GENERATION GUIDELINES:**

minimalInput:
- Use only essential parameters
- Use minimal/default values
- Focus on core functionality
- Limit results to 3 items maximum
- Use realistic but simple test data

normalInput:
- Include required + common optional parameters
- Use realistic, varied input values
- Test different data types and options
- Use diverse but valid test data
- Limit results to 3 items maximum

maximalInput:
- Utilize as many input parameters as possible
- Test comprehensive feature combinations
- Use diverse, realistic test data
- Explore all enum options and array inputs
- Test edge cases within valid ranges
- Limit results to 3 items maximum

edgeInput:
- Create an input that will cause an error notification
- Use parameter values that pass input validation but will fail during execution
- For text inputs, use nonsensical strings like "cnserjhvlsberuvberv" instead of normal words
- Use invalid but structurally correct data types
- This input is designed to test runtime error handling

Input Variation Guidelines:

**GENERIC VALIDATION RULES:**
- Use realistic test data that matches the Actor's domain
- For URLs: Use valid, existing URLs from the target platform
- For IDs: Use real IDs from the target platform when possible
- For locations: Use various geographic locations and formats
- For numbers: Test different ranges, limits, and constraints
- For booleans: Test both true and false values across runs
- For arrays: Test different array lengths and content types
- For enums: Test different enum values across the 4 inputs

**PLATFORM-SPECIFIC GUIDELINES:**
- For Google Maps Actors: Use real Place IDs or valid Google Maps URLs
- For Instagram Actors: Use real usernames, hashtags, or post URLs
- For Twitter Actors: Use real usernames, hashtags, or tweet IDs
- For YouTube Actors: Use real video IDs or channel URLs
- For LinkedIn Actors: Use real company names or profile URLs
- For Facebook Actors: Use real page names or post URLs

**CRITICAL: Each configuration must use realistic, valid data that the Actor can actually process**

Output Format: Return the results in this exact JSON structure:
{
    "minimalInput": { /* minimal configuration */ },
    "normalInput": { /* normal configuration */ },
    "maximalInput": { /* maximal configuration */ },
    "edgeInput": { /* error-causing configuration */ },
    "targetActorId": "${actorTechnicalName}"
}`;
    }
}
