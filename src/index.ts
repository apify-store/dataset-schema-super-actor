import { Actor } from 'apify';

// Import integrated Actor modules
import { LLMInputCreator } from './actors/llm-input-creator.js';
import { DatasetSchemaGenerator } from './actors/dataset-schema-generator.js';
import { LLMSchemaEnhancer } from './actors/llm-schema-enhancer.js';
import { DatasetSchemaValidator } from './actors/dataset-schema-validator.js';
import { CreatePRService } from './actors/create-pr-service.js';
import { InputValidator } from './actors/input-validator.js';

// Define input interface
interface SuperActorInput {
    actorTechnicalName: string;
    githubLink: string;
    githubToken: string;
    redashToken: string;
    generateViews?: boolean;
    daysBack?: string;
    maximumResults?: string;
    minimumResults?: string;
    runsPerUser?: string;
}

// Define output interface
interface SuperActorOutput {
    success: boolean;
    prUrl?: string;
    error?: string;
    progress: {
        actorValidation: 'skipped' | 'completed' | 'failed';
        inputGeneration: 'skipped' | 'completed' | 'failed';
        schemaGeneration: 'skipped' | 'completed' | 'failed';
        schemaEnhancement: 'skipped' | 'completed' | 'failed';
        schemaValidation: 'skipped' | 'completed' | 'failed';
        prCreation: 'skipped' | 'completed' | 'failed';
    };
    details?: {
        actorName?: string;
        generatedSchema?: any;
        validationResults?: any;
        prInfo?: any;
    };
}

// Centralized error handling
function handleError(context: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}:`, message);
    throw new Error(`${context}: ${message}`);
}

// Main SuperActor class
class DatasetSchemaSuperActor {
    private input: SuperActorInput;
    private progress: SuperActorOutput['progress'];
    private inputValidator: InputValidator;

    constructor(input: SuperActorInput) {
        this.input = input;
        this.inputValidator = new InputValidator();
        this.progress = {
            actorValidation: 'skipped',
            inputGeneration: 'skipped',
            schemaGeneration: 'skipped',
            schemaEnhancement: 'skipped',
            schemaValidation: 'skipped',
            prCreation: 'skipped'
        };
    }

    async run(): Promise<SuperActorOutput> {
        console.log('🚀 Starting Dataset Schema SuperActor...');
        console.log(`Target Actor: ${this.input.actorTechnicalName}`);
        console.log(`GitHub Repo: ${this.input.githubLink}`);

        const details: SuperActorOutput['details'] = {
            actorName: this.input.actorTechnicalName
        };

        try {
            // Step 1: Generate test inputs
            console.log('\n🤖 Step 1: Generating test inputs...');
            const testInputs = await this.generateTestInputs();
            this.progress.inputGeneration = 'completed';

            // Step 2: Generate initial schema
            console.log('\n📊 Step 2: Generating initial dataset schema...');
            const initialSchema = await this.generateInitialSchema(testInputs);
            this.progress.schemaGeneration = 'completed';

            // Step 3: Enhance schema with AI
            console.log('\n✨ Step 3: Enhancing schema with AI...');
            const enhancedSchema = await this.enhanceSchema(initialSchema);
            this.progress.schemaEnhancement = 'completed';

            // Step 4: Validate schema against real data
            console.log('\n🔍 Step 4: Validating schema against real data...');
            const validationResults = await this.validateSchema(enhancedSchema);
            this.progress.schemaValidation = 'completed';

            // Step 5: Create GitHub PR
            console.log('\n📝 Step 5: Creating GitHub PR...');
            const prResult = await this.createPR(enhancedSchema);
            this.progress.prCreation = 'completed';

            details.generatedSchema = enhancedSchema;
            details.validationResults = validationResults;
            details.prInfo = prResult.prInfo;

            console.log('\n🎉 Dataset Schema SuperActor completed successfully!');
            console.log(`PR URL: ${prResult.prUrl}`);

            return {
                success: true,
                prUrl: prResult.prUrl,
                progress: this.progress,
                details
            };

        } catch (error) {
            console.error('\n💥 Dataset Schema SuperActor failed:', error);
            
            // Re-throw the error to be caught by the main function
            throw error;
        }
    }

    private async generateTestInputs(): Promise<any> {
        try {
            const inputCreator = new LLMInputCreator();
            let testInputs: any;
            let validationResult: any;
            let attempt = 0;
            const maxAttempts = 3;

            do {
                attempt++;
                console.log(`\n🔄 Input Generation Attempt ${attempt}/${maxAttempts}`);
                
                // Generate test inputs
                const feedback = attempt > 1 ? this.inputValidator.generateValidationFeedback(validationResult) : undefined;
                testInputs = await inputCreator.generateTestInputs(this.input.actorTechnicalName, feedback);
                
                console.log('✅ Test inputs generated successfully');
                console.log(`- Minimal input: ${Object.keys(testInputs.minimalInput).length} fields`);
                console.log(`- Normal input: ${Object.keys(testInputs.normalInput).length} fields`);
                console.log(`- Maximal input: ${Object.keys(testInputs.maximalInput).length} fields`);
                console.log(`- Edge input: ${Object.keys(testInputs.edgeInput).length} fields`);
                
                // Validate inputs
                console.log('\n🔍 Validating generated inputs...');
                validationResult = await this.inputValidator.validateInputs(this.input.actorTechnicalName, testInputs);
                
                if (validationResult.overallSuccess) {
                    console.log('✅ Input validation passed - proceeding with schema generation');
                    break;
                } else {
                    console.log(`❌ Input validation failed: ${validationResult.successfulRuns}/${validationResult.totalRuns} inputs valid`);
                    if (attempt < maxAttempts) {
                        console.log('🔄 Retrying with feedback...');
                    } else {
                        console.log('❌ Max retry attempts reached');
                    }
                }
                
            } while (attempt < maxAttempts && !validationResult.overallSuccess);

            if (!validationResult.overallSuccess) {
                this.progress.inputGeneration = 'failed';
                handleError('Input validation failed', `Failed to generate valid inputs after ${maxAttempts} attempts. Only ${validationResult.successfulRuns}/${validationResult.totalRuns} inputs were valid.`);
            }
            
            return testInputs;
            
        } catch (error) {
            this.progress.inputGeneration = 'failed';
            handleError('Test input generation failed', error);
        }
    }

    private async generateInitialSchema(testInputs: any): Promise<any> {
        try {
            const schemaGenerator = new DatasetSchemaGenerator();
            
            // Run Actor with test inputs
            const runResults = await schemaGenerator.runActorWithInputs(
                this.input.actorTechnicalName,
                {
                    minimal: testInputs.minimalInput,
                    normal: testInputs.normalInput,
                    maximal: testInputs.maximalInput,
                    edge: testInputs.edgeInput
                }
            );

            // Validate run results
            const validation = schemaGenerator.validateRunResults(runResults);
            console.log(`Validation: ${validation.summary}`);
            
            if (!validation.overallSuccess) {
                this.progress.schemaGeneration = 'failed';
                handleError('Schema generation failed', `Insufficient successful runs: ${validation.summary}`);
            }

            // Collect dataset IDs
            const datasetIds = await schemaGenerator.collectDatasetIds(runResults);
            console.log(`Found ${datasetIds.length} dataset(s): ${datasetIds.join(', ')}`);
            
            if (datasetIds.length === 0) {
                this.progress.schemaGeneration = 'failed';
                handleError('Schema generation failed', 'No datasets found from successful runs');
            }

            // Generate schema using the schema generator Actor
            const schemaGeneratorActorId = 'kMFja3BjKqZiO7pGc'; // This should be the actual schema generator Actor ID
            const schemaResult = await schemaGenerator.generateDatasetSchema(datasetIds, schemaGeneratorActorId);
            
            if (schemaResult.error) {
                this.progress.schemaGeneration = 'failed';
                handleError('Schema generation failed', schemaResult.error);
            }

            console.log('✅ Initial schema generated successfully');
            return schemaResult;
            
        } catch (error) {
            this.progress.schemaGeneration = 'failed';
            throw error; // Re-throw to be caught by the main run() method
        }
    }

    private async enhanceSchema(initialSchema: any): Promise<any> {
        try {
            console.log('Enhancing schema with Claude Sonnet 4...');
            console.log('Initial schema structure:', JSON.stringify(initialSchema, null, 2));
            
            const schemaEnhancer = new LLMSchemaEnhancer();
            
            const enhancementResult = await schemaEnhancer.enhanceSchema({
                actorName: this.input.actorTechnicalName,
                datasetSchema: initialSchema.schema!,
                generateViews: this.input.generateViews || false
            });

            console.log('Enhancement result:', JSON.stringify(enhancementResult, null, 2));

            if (!enhancementResult.success) {
                this.progress.schemaEnhancement = 'failed';
                handleError('Schema enhancement failed', enhancementResult.error);
            }

            console.log('✅ Schema enhanced successfully');
            if (!enhancementResult.enhancedSchema) {
                this.progress.schemaEnhancement = 'failed';
                handleError('Schema enhancement failed', 'No enhanced schema returned');
            }
            return enhancementResult.enhancedSchema;
            
        } catch (error) {
            this.progress.schemaEnhancement = 'failed';
            console.error('Schema enhancement error details:', error);
            throw error; // Re-throw to be caught by the main run() method
        }
    }

    private async validateSchema(enhancedSchema: any): Promise<any> {
        try {
            const validator = new DatasetSchemaValidator();
            
            const validationResult = await validator.processValidation({
                actorId: this.input.actorTechnicalName,
                datasetSchema: enhancedSchema,
                redashApiKey: this.input.redashToken,
                daysBack: parseInt(this.input.daysBack || '5', 10),
                maximumResults: parseInt(this.input.maximumResults || '10', 10),
                minimumResults: parseInt(this.input.minimumResults || '1', 10),
                runsPerUser: parseInt(this.input.runsPerUser || '1', 10)
            });

            console.log(`Validation Summary: ${validationResult.summary.validDatasets}/${validationResult.totalDatasets} datasets valid (${(validationResult.summary.successRate * 100).toFixed(1)}% success rate)`);
            
            // Validate success rate if there are datasets to validate
            // FAIL if ANY dataset fails validation (success rate must be 100%)
            if (validationResult.totalDatasets > 0 && validationResult.summary.successRate < 1.0) {
                this.progress.schemaValidation = 'failed';
                handleError('Schema validation failed', `Validation failed: ${validationResult.summary.invalidDatasets} out of ${validationResult.totalDatasets} datasets failed validation. Success rate: ${(validationResult.summary.successRate * 100).toFixed(1)}%`);
            }
            
            // Fail if no datasets found for validation - validation is required
            if (validationResult.totalDatasets === 0) {
                this.progress.schemaValidation = 'failed';
                handleError('Schema validation failed', 'No datasets found for validation - validation is required and cannot be skipped');
            }

            console.log('✅ Schema validation passed');
            return validationResult;
            
        } catch (error) {
            this.progress.schemaValidation = 'failed';
            throw error; // Re-throw to be caught by the main run() method
        }
    }

    private async createPR(enhancedSchema: any): Promise<{ success: boolean; prUrl?: string; error?: string; prInfo?: any }> {
        try {
            const prService = new CreatePRService({
                datasetSchema: enhancedSchema,
                githubLink: this.input.githubLink,
                githubToken: this.input.githubToken,
                generateViews: this.input.generateViews || false,
                actorTechnicalName: this.input.actorTechnicalName
            });

            const prResult = await prService.run();

            if (!prResult.success) {
                this.progress.prCreation = 'failed';
                handleError('PR creation failed', prResult.error);
            }

            console.log('✅ PR created successfully');
            return prResult;
            
        } catch (error) {
            this.progress.prCreation = 'failed';
            throw error; // Re-throw to be caught by the main run() method
        }
    }
}

// Main execution
async function main() {
    try {
        // Initialize the Actor
        await Actor.init();

        const input = await Actor.getInput<SuperActorInput>();
        
        if (!input) {
            handleError('Input validation failed', 'No input provided');
        }

        // Validate required inputs
        if (!input!.actorTechnicalName) {
            handleError('Input validation failed', 'actorTechnicalName is required');
        }
        if (!input!.githubLink) {
            handleError('Input validation failed', 'githubLink is required');
        }
        if (!input!.githubToken) {
            handleError('Input validation failed', 'githubToken is required');
        }
        if (!input!.redashToken) {
            handleError('Input validation failed', 'redashToken is required');
        }

        console.log('Starting Dataset Schema SuperActor...');

        const superActor = new DatasetSchemaSuperActor(input!);
        const result = await superActor.run();
        
        // Store results
        await Actor.setValue('OUTPUT', result);
        await Actor.pushData(result);
        
        console.log('Dataset Schema SuperActor completed');
        console.log('Results:', JSON.stringify(result, null, 2));
        
        await Actor.exit();
    } catch (error) {
        console.error('💥 Actor execution failed:', error);
        await Actor.exit('FAILED');
    }
}

// Run the main function
main().catch((error) => {
    console.error('💥 Fatal error in main function:', error);
    process.exit(1);
});
