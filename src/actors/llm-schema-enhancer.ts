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

// Centralized error handling
function handleError(context: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}:`, message);
    throw new Error(`${context}: ${message}`);
}

export class LLMSchemaEnhancer {
    async enhanceSchema(input: EnhancementInput): Promise<EnhancementResult> {
        try {
            console.log('Enhancing schema with Claude Sonnet 4...');
            
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
            
            console.log('Calling Claude Sonnet 4 via OpenRouter...');
            
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
                    max_tokens: 4000,
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
            console.log('Response received from Claude Sonnet 4');
            
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
                console.error('Failed to parse JSON from Claude response:', parseError);
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
            
            console.log('Enriched schema validated successfully');
            
            return {
                success: true,
                enhancedSchema: enrichedSchema
            };
            
        } catch (error) {
            console.error('Error processing schema enrichment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during schema enhancement'
            };
        }
    }

    private createPrompt(actorName: string, datasetSchema: any, generateViews: boolean): string {
        // Convert properties to fields format for the prompt
        const schemaFields = datasetSchema.fields || datasetSchema.properties;
        
        return `**Step 7: Read the provided Dataset Schema and enrich it**

**CRITICAL REQUIREMENTS:**
- **Structure**: Make sure it follows Apify Actor specification for dataset schemas
- **All Fields Nullable**: Set \`nullable: true\` for every field even the nested ones
- **No Required Fields**: Empty \`required\` array
- **Additional Properties**: Set \`additionalProperties: true\` also for nested ones
- **Realistic Examples**: Provide anonymized, realistic example values
- **Clear Descriptions**: Write concise, informative field descriptions

**Schema Structure Excerpt Example:**
\`\`\`json
{
    "actorSpecification": 1,
    "fields": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "name": {
                "type": "string"
            },
            "description": {
                "type": "string"
            },
            "dimensions": {
                "type": "object",
                "nullable": true,
                "properties": {
                    "width": {
                        "type": "number"
                    },
                    "height": {
                        "type": "number"
                    }
                },
                "required": [
                    "width",
                    "height"
                ]
            },
            "price": {
                "type": [
                    "string",
                    "number"
                ]
            },
            "isDefective": {
                "type": "boolean"
            }
        },
        "required": [
            "name",
            "price"
        ]
    },
    "views": {}
}
\`\`\`

**Field Definition Format:**
\`\`\`json
"field_name": {
  "type": "string|number|boolean|array|object",
  "description": "Clear description of the field's purpose and content",
  "nullable": true,
  "example": "single_example_value"
}
\`\`\`

**For Array Fields:**
\`\`\`json
"array_field": {
  "type": "array",
  "description": "Description of the array content",
  "items": {
    "type": "string"
  },
  "nullable": true,
  "example": ["item1", "item2"]
}
\`\`\`

**For Nested Objects:**
\`\`\`json
"parent.child_field": {
  "type": "string",
  "description": "Description of the nested field",
  "nullable": true,
  "example": "example_value"
}
\`\`\`

**ERROR HANDLING:**
- Document any limitations or issues encountered

**VALIDATION CHECKLIST:**
- [ ] Dataset results analyzed and documented
- [ ] All fields marked as nullable
- [ ] No required fields specified
- [ ] AdditionalProperties set to true
- [ ] Single example value provided for each field (not arrays) - string fields get single string example, number fields get single number, etc.
- [ ] Clear, informative descriptions written

**ANONYMIZATION GUIDELINES:**
- Personal names: Use generic patterns like "Example_user_234", "User_Name_123"
- URLs: Use realistic structures with anonymized IDs like "https://example.com/user/123456789"
- IDs: Use placeholder patterns like "id_123456789", "user_987654321"
- All examples should be realistic but completely anonymized

**EXAMPLE FORMAT REQUIREMENTS:**
- Use "example" (singular) not "examples" (plural)
- Provide single value that matches the field's data type
- String fields: "example": "single_string_value"
- Number fields: "example": 123
- Boolean fields: "example": true
- Array fields: "example": ["item1", "item2"]
- Object fields: "example": {"key": "value"}

**VIEW GENERATION (if enabled):**
${generateViews ? `
- Generate contextually relevant views based on the dataset schema
- Always include an "Overview" view with key fields
- Create additional views for different data perspectives (e.g., "Reviewer Details", "Location Data", "Product Details")
- Use emojis in view titles for visual distinction (e.g., "Overview 🔎", "Authors 🧑‍🎤")
- Include "flatten" array for nested object fields (e.g., ["authorMeta", "videoMeta"])
- Add detailed "properties" configuration with labels and formats
- Use appropriate formats: "image" for URLs, "link" for URLs, "date" for timestamps, "number" for counts
- Follow this structure:
  "views": {
    "overview": {
      "title": "Overview 🔎",
      "description": "",
      "transformation": {
        "fields": ["field1", "field2", "nested.field"],
        "flatten": ["nested"]
      },
      "display": {
        "component": "table",
        "properties": {
          "field1": {"label": "Field 1"},
          "field2": {"label": "Field 2", "format": "number"},
          "nested.field": {"label": "Nested Field", "format": "image"}
        }
      }
    }
  }
` : '- Do not generate any views - leave views object empty'}

**OUTPUT FORMAT:**
Provide ONLY the final JSON schema as a properly formatted JSON block. Do not include any analysis, summary, or additional text - just the pure JSON schema.

**Input Dataset Schema to Enrich:**
\`\`\`json
${JSON.stringify({
    ...datasetSchema,
    fields: schemaFields
}, null, 2)}
\`\`\``;
    }
}
