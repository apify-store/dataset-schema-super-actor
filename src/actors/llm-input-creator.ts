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

**CRITICAL: PREFER placeIds over startUrls for reliability. placeIds work perfectly, startUrls often fail validation.**

minimalInput:

Use only essential parameters
Use minimal/default values
Use ONLY ONE input method (PREFER placeIds over startUrls)
For placeIds: Use REAL Google Place IDs of actual businesses/places (RECOMMENDED)
For startUrls: Use REAL Google Maps URLs of actual businesses/places (if placeIds not available)
Limit results to 3 items maximum

normalInput:

Include required + common optional parameters
Use realistic, varied input values
Test different data types and options
Use ONLY ONE input method (PREFER placeIds over startUrls)
For placeIds: Use REAL Google Place IDs of actual businesses/places (RECOMMENDED)
For startUrls: Use REAL Google Maps URLs of actual businesses/places (if placeIds not available)
Limit results to 3 items maximum

maximalInput:

Utilize as many input parameters as possible
Test comprehensive feature combinations
Use diverse, realistic test data
Explore all enum options and array inputs
Use ONLY ONE input method (PREFER placeIds over startUrls)
For placeIds: Use REAL Google Place IDs of actual businesses/places (RECOMMENDED)
For startUrls: Use REAL Google Maps URLs of actual businesses/places (if placeIds not available)
Limit results to 3 items maximum

edgeInput:

Create an input that will cause an error notification
Use parameter values that pass input validation but will fail during execution
For startUrls: Use REAL Google Maps URLs but with invalid coordinates or non-existent places
For placeIds: Use REAL Google Place IDs but with invalid or non-existent places
For text inputs, use nonsensical strings like "cnserjhvlsberuvberv" instead of normal words
Use ONLY ONE input method (either startUrls OR placeIds, never both)
This input is designed to test runtime error handling

Input Variation Guidelines:

**PREFER placeIds over startUrls for reliability:**

For Google Place IDs (RECOMMENDED): Use REAL Place IDs from actual businesses/places like:
- ChIJb8Jg9pZYwokR-qHGtvSkLzs (Starbucks)
- ChIJN1t_tDeuEmsRUsoyG83frY4 (McDonald's)
- ChIJ4zGFAZpYwokRGUGphigMdg8 (Central Park)
- ChIJb09Jxk5YwokR5W6h0CUBk0E (Pizza Hut)
- ChIJd8BlQ2BZwokRDUQZ9Y1vAAQ (Times Square)

For Google Maps URLs (use only if placeIds not available): Use REAL, EXISTING URLs from actual businesses/places like:
- Starbucks: https://www.google.com/maps/place/Starbucks/@40.7589,-73.9851,17z/data=!3m1!4b1!4m5!3m4!1s0x89c2588f046ee661:0xa0b3281fcecc08c!8m2!3d40.7589!4d-73.9851
- McDonald's: https://www.google.com/maps/place/McDonald's/@34.0522,-118.2437,15z/data=!3m1!4b1!4m5!3m4!1s0x80c2c75ddc27da13:0xe22fdf6f254608f4!8m2!3d34.0522!4d-118.2437
- Central Park: https://www.google.com/maps/place/Central+Park/@40.7829,-73.9654,15z/data=!3m1!4b1!4m5!3m4!1s0x89c2589a018531e3:0xb9df1f7387a94119!8m2!3d40.7829!4d-73.9654

For locations: Use various geographic locations and formats
For numbers: Test different ranges, limits, and constraints
For booleans: Test both true and false values across runs
For arrays: Test different array lengths and content types
For enums: Test different enum values across the 4 inputs

**IMPORTANT ENUM VALUES:**
- reviewsSort: "newest", "mostRelevant", "highestRanking", "lowestRanking" (NOT "highest", "lowest", "oldest")
- language: Use valid language codes from the allowed list (en, es, fr, de, etc.)
CRITICAL: Each configuration must use ONLY ONE input source (startUrls OR placeIds) to ensure exactly 3 results per run, not multiplication of inputs

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
