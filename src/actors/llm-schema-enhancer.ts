import { log } from 'apify';

interface EnhancementInput {
    actorName: string;
    datasetSchema: any;
    generateViews?: boolean;
}

interface EnhancementResult {
    success: boolean;
    enhancedSchema?: any;
    error?: string;
}

export class LLMSchemaEnhancer {
    async enhanceSchema(input: EnhancementInput): Promise<EnhancementResult> {
        try {
            log.info('Enhancing schema with Claude Sonnet 4...');

            // Validate input
            if (!input.actorName || !input.datasetSchema) {
                return {
                    success: false,
                    error: 'Missing required input: actorName and datasetSchema are required'
                };
            }
            
            // Check if datasetSchema has required structure
            // Handle both "fields" and "properties" formats
            const schemaFields = input.datasetSchema.fields || input.datasetSchema.properties;
            if (!schemaFields || typeof schemaFields !== 'object') {
                return {
                    success: false,
                    error: 'Invalid datasetSchema: must contain a "fields" or "properties" object'
                };
            }
            
            // Check input size limits
            const inputSize = JSON.stringify(input).length;
            const maxInputSize = 1024 * 1024; // 1MB limit
            
            if (inputSize > maxInputSize) {
                return {
                    success: false,
                    error: `Input too large: ${inputSize} bytes exceeds maximum allowed size of ${maxInputSize} bytes`
                };
            }
            
            // Check prompt size limits
            const promptSize = JSON.stringify(input.datasetSchema).length;
            const maxPromptSize = 500 * 1024; // 500KB limit for schema
            
            if (promptSize > maxPromptSize) {
                return {
                    success: false,
                    error: `Dataset schema too large: ${promptSize} bytes exceeds maximum allowed size of ${maxPromptSize} bytes`
                };
            }
            
            const generateViews = input.generateViews || false;
            
            // Prepare the prompt for schema enrichment
            const prompt = this.createPrompt(input.actorName, input.datasetSchema, generateViews);

            log.info('Calling Claude Sonnet 4 via OpenRouter...');

            // Call Claude Sonnet 4 via OpenRouter with timeout
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
                            content: prompt,
                        },
                    ],
                    model: 'anthropic/claude-sonnet-4',
                    temperature: 0.1,
                })
            });
            
            if (!response.ok) {
                return {
                    success: false,
                    error: `OpenRouter API request failed: HTTP ${response.status}`
                };
            }
            
            const data = await response.json();
            
            if (!data || !data.choices || !data.choices[0]?.message?.content) {
                return {
                    success: false,
                    error: 'Invalid response structure from OpenRouter service'
                };
            }
            
            const content = data.choices[0].message.content;
            log.info('Response received from Claude Sonnet 4');

            // Try to extract JSON from the response
            let enrichedSchema;
            try {
                // Look for JSON block in the response
                const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
                if (jsonMatch) {
                    enrichedSchema = JSON.parse(jsonMatch[1]);
                } else {
                    // Try to parse the entire response as JSON
                    enrichedSchema = JSON.parse(content);
                }
            } catch (parseError) {
                log.error('Failed to parse JSON from Claude response:', { error: parseError });
                return {
                    success: false,
                    error: `Failed to parse enriched schema from Claude response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`
                };
            }
            
            // Validate the enriched schema structure
            if (!enrichedSchema.actorSpecification || !enrichedSchema.fields) {
                return {
                    success: false,
                    error: 'Enriched schema does not follow Apify Actor specification format'
                };
            }

            log.info('Enriched schema validated successfully');

            return {
                success: true,
                enhancedSchema: enrichedSchema
            };
            
        } catch (error) {
            log.error('Error processing schema enrichment:', { error });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during schema enhancement'
            };
        }
    }

    private createPrompt(actorName: string, datasetSchema: any, generateViews: boolean): string {
        // Convert properties to fields format for the prompt
        const schemaFields = datasetSchema.fields || datasetSchema.properties;
        
        return `Enhance this dataset schema for Actor: ${actorName}

**REQUIREMENTS:**
1. Follow Apify Actor specification format: https://docs.apify.com/platform/actors/development/actor-definition/dataset-schema/validation
2. **ONLY enhance the existing fields** - use exactly these field names: ${Object.keys(schemaFields).join(', ')}
3. **DO NOT add new fields** - only improve descriptions, examples, and formatting of existing fields
4. **DO NOT rename or remove fields** - keep all field names identical to the original schema
5. Set all fields as nullable: true
6. Empty required array
7. Add realistic, anonymized examples
8. Write clear field descriptions

**SCHEMA FORMAT:**
\`\`\`json
{
  "actorSpecification": 1,
  "fields": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "field_name": {
        "type": "string",
        "description": "Clear description",
        "nullable": true,
        "example": "example_value"
      }
    },
    "required": []
  },
  "views": {}
}
\`\`\`

**FIELD RULES:**
- String fields: "example": "single_string"
- Number fields: "example": 123
- Boolean fields: "example": true
- Array fields: "example": ["item1", "item2"]
- Object fields: "example": {"key": "value"}

**ANONYMIZATION:**
- Names: "User_123", "Example_Name"
- URLs: "https://example.com/user/123456"
- IDs: "id_123456789"

${generateViews ? `
**VIEW GENERATION:**
Create relevant views with:
- Overview view with key fields
- Emojis in titles (e.g., "Overview 🔎")
- Proper formatting (image, link, date, number)
- Flatten nested objects
` : '**VIEWS:** Leave empty - do not generate views'}

**OUTPUT:** Return only the JSON schema, no other text. Before returning, verify that:
- All field names match exactly with the original dataset schema
- No new fields were added
- No fields were removed
- Only descriptions, examples, and formatting were changed

**ORIGINAL DATASET SCHEMA TO ENHANCE:**
\`\`\`json
${JSON.stringify({
    ...datasetSchema,
    fields: schemaFields
}, null, 2)}
\`\`\``;
    }
}
