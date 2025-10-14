import { Actor, log } from 'apify';

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
    
    // Step 1: Generate inputs
    generateInputs?: boolean;
    
    // Step 2: Generate schema
    generateSchema?: boolean;
    existingMinimalInput?: string;
    existingNormalInput?: string;
    existingMaximalInput?: string;
    existingEdgeInput?: string;
    
    // Step 3: Schema Enhancement
    enhanceSchema?: boolean;
    existingEnhancedSchema?: string;
    generateViews?: boolean;
    
    // Step 4: Schema Validation
    validateSchema?: boolean;
    redashToken?: string;
    daysBack?: string;
    maximumResults?: string;
    minimumResults?: string;
    runsPerUser?: string;
    
    // Step 5: GitHub PR Creation
    createPR?: boolean;
    githubLink?: string;
    githubToken?: string;
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
    log.error(`${context}: ${message}`);
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
        log.info('🚀 Starting Dataset Schema SuperActor...');
        log.info(`Target Actor: ${this.input.actorTechnicalName}`);
        
        // Log enabled steps
        const enabledSteps = this.getEnabledSteps();
        log.info(`Enabled steps: ${enabledSteps.join(', ')}`);

        const details: SuperActorOutput['details'] = {
            actorName: this.input.actorTechnicalName
        };

        try {
            let testInputs: any = null;
            let initialSchema: any = null;
            let enhancedSchema: any = null;
            let validationResults: any = null;
            let prResult: any = null;

            // Step 1: Generate test inputs (if enabled)
            if (this.input.generateInputs) {
                log.info('\n🤖 Step 1: Generating test inputs...');
                testInputs = await this.generateTestInputs();
                this.progress.inputGeneration = 'completed';
            } else {
                log.info('\n⏭️ Step 1: Skipped (generateInputs = false)');
                this.progress.inputGeneration = 'skipped';
            }

            // Step 2: Generate initial schema (if enabled)
            if (this.input.generateSchema) {
                log.info('\n📊 Step 2: Generating initial dataset schema...');
                initialSchema = await this.generateInitialSchema(testInputs);
                this.progress.schemaGeneration = 'completed';
            } else {
                log.info('\n⏭️ Step 2: Skipped (generateSchema = false)');
                this.progress.schemaGeneration = 'skipped';
            }

            // Step 3: Enhance schema with AI (if enabled)
            if (this.input.enhanceSchema) {
                log.info('\n✨ Step 3: Enhancing schema with AI...');
                enhancedSchema = await this.enhanceSchema(initialSchema);
                this.progress.schemaEnhancement = 'completed';
            } else {
                log.info('\n⏭️ Step 3: Skipped (enhanceSchema = false)');
                this.progress.schemaEnhancement = 'skipped';
            }

            // Step 4: Validate schema against real data (if enabled)
            if (this.input.validateSchema) {
                log.info('\n🔍 Step 4: Validating schema against real data...');
                validationResults = await this.validateSchema(enhancedSchema);
                this.progress.schemaValidation = 'completed';
            } else {
                log.info('\n⏭️ Step 4: Skipped (validateSchema = false)');
                this.progress.schemaValidation = 'skipped';
            }

            // Step 5: Create GitHub PR (if enabled)
            if (this.input.createPR) {
                log.info('\n📝 Step 5: Creating GitHub PR...');
                prResult = await this.createPR(enhancedSchema);
                this.progress.prCreation = 'completed';
            } else {
                log.info('\n⏭️ Step 5: Skipped (createPR = false)');
                this.progress.prCreation = 'skipped';
            }

            details.generatedSchema = enhancedSchema;
            details.validationResults = validationResults;
            details.prInfo = prResult?.prInfo;

            log.info('\n🎉 Dataset Schema SuperActor completed successfully!');
            if (prResult?.prUrl) {
                log.info(`PR URL: ${prResult.prUrl}`);
            }

            return {
                success: true,
                prUrl: prResult?.prUrl,
                progress: this.progress,
                details
            };

        } catch (error) {
            log.error('\n💥 Dataset Schema SuperActor failed:', { error });

            // Re-throw the error to be caught by the main function
            throw error;
        }
    }

    private getEnabledSteps(): string[] {
        const steps: string[] = [];
        if (this.input.generateInputs) steps.push('Generate Inputs');
        if (this.input.generateSchema) steps.push('Generate Schema');
        if (this.input.enhanceSchema) steps.push('Enhance Schema');
        if (this.input.validateSchema) steps.push('Validate Schema');
        if (this.input.createPR) steps.push('Create PR');
        return steps;
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
                log.info(`\n🔄 Input Generation Attempt ${attempt}/${maxAttempts}`);

                // Generate test inputs
                const feedback = attempt > 1 ? this.inputValidator.generateValidationFeedback(validationResult) : undefined;
                testInputs = await inputCreator.generateTestInputs(this.input.actorTechnicalName, feedback);

                log.info('✅ Test inputs generated successfully');
                log.info(`- Minimal input: ${Object.keys(testInputs.minimalInput).length} fields`);
                log.info(`- Normal input: ${Object.keys(testInputs.normalInput).length} fields`);
                log.info(`- Maximal input: ${Object.keys(testInputs.maximalInput).length} fields`);
                log.info(`- Edge input: ${Object.keys(testInputs.edgeInput).length} fields`);

                // Validate inputs
                log.info('\n🔍 Validating generated inputs...');
                validationResult = await this.inputValidator.validateInputs(this.input.actorTechnicalName, testInputs);
                
                if (validationResult.overallSuccess) {
                    log.info('✅ Input validation passed - proceeding with schema generation');
                    break;
                } else {
                    log.info(
                        `❌ Input validation failed: ${validationResult.successfulRuns}/${validationResult.totalRuns} inputs valid`,
                    );
                    if (attempt < maxAttempts) {
                        log.info('🔄 Retrying with feedback...');
                    } else {
                        log.info('❌ Max retry attempts reached');
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

    private hasExistingTestInputs(): boolean {
        return !!(
            this.input.existingMinimalInput?.trim() ||
            this.input.existingNormalInput?.trim() ||
            this.input.existingMaximalInput?.trim() ||
            this.input.existingEdgeInput?.trim()
        );
    }

    private parseExistingTestInputs(): any {
        try {
            return {
                minimal: this.input.existingMinimalInput?.trim() ? JSON.parse(this.input.existingMinimalInput!) : null,
                normal: this.input.existingNormalInput?.trim() ? JSON.parse(this.input.existingNormalInput!) : null,
                maximal: this.input.existingMaximalInput?.trim() ? JSON.parse(this.input.existingMaximalInput!) : null,
                edge: this.input.existingEdgeInput?.trim() ? JSON.parse(this.input.existingEdgeInput!) : null
            };
        } catch (error) {
            handleError('Invalid existing test inputs', `Failed to parse existing test inputs as JSON: ${error}`);
        }
    }

    private async generateInitialSchema(testInputs: any): Promise<any> {
        try {
            const schemaGenerator = new DatasetSchemaGenerator();
            
            // Use existing test inputs if provided, otherwise use generated ones
            let inputsToUse: any;
            if (this.hasExistingTestInputs()) {
                log.info('Using existing test inputs provided by user');
                inputsToUse = this.parseExistingTestInputs();
            } else if (testInputs) {
                log.info('Using generated test inputs from Step 1');
                inputsToUse = {
                    minimal: testInputs.minimalInput,
                    normal: testInputs.normalInput,
                    maximal: testInputs.maximalInput,
                    edge: testInputs.edgeInput
                };
            } else {
                handleError('Schema generation failed', 'No test inputs available. Either enable Step 1 (generateInputs) or provide existing test inputs.');
            }
            
            // Run Actor with test inputs
            const runResults = await schemaGenerator.runActorWithInputs(
                this.input.actorTechnicalName,
                inputsToUse
            );

            // Validate run results
            const validation = schemaGenerator.validateRunResults(runResults);
            log.info(`Validation: ${validation.summary}`);

            if (!validation.overallSuccess) {
                this.progress.schemaGeneration = 'failed';
                handleError('Schema generation failed', `Insufficient successful runs: ${validation.summary}`);
            }

            // Collect dataset IDs
            const datasetIds = await schemaGenerator.collectDatasetIds(runResults);
            log.info(`Found ${datasetIds.length} dataset(s): ${datasetIds.join(', ')}`);

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

            log.info('✅ Initial schema generated successfully');
            return schemaResult;
            
        } catch (error) {
            this.progress.schemaGeneration = 'failed';
            throw error; // Re-throw to be caught by the main run() method
        }
    }

    private async enhanceSchema(initialSchema: any): Promise<any> {
        try {
            // Use existing enhanced schema if provided
            if (this.input.existingEnhancedSchema?.trim()) {
                log.info('Using existing enhanced schema provided by user');
                try {
                    return JSON.parse(this.input.existingEnhancedSchema);
                } catch (error) {
                    handleError('Invalid existing enhanced schema', `Failed to parse existing enhanced schema as JSON: ${error}`);
                }
            }
            
            // Check if we have initial schema to enhance
            if (!initialSchema) {
                handleError('Schema enhancement failed', 'No initial schema available. Either enable Step 2 (generateSchema) or provide existing enhanced schema.');
            }
            
            log.info('Enhancing schema with Claude Sonnet 4...');
            log.info('Initial schema structure:', { schema: initialSchema });

            const schemaEnhancer = new LLMSchemaEnhancer();
            
            const enhancementResult = await schemaEnhancer.enhanceSchema({
                actorName: this.input.actorTechnicalName,
                datasetSchema: initialSchema.schema!,
                generateViews: this.input.generateViews || false
            });

            log.info('Enhancement result:', { result: enhancementResult });

            if (!enhancementResult.success) {
                this.progress.schemaEnhancement = 'failed';
                handleError('Schema enhancement failed', enhancementResult.error);
            }

            log.info('✅ Schema enhanced successfully');
            if (!enhancementResult.enhancedSchema) {
                this.progress.schemaEnhancement = 'failed';
                handleError('Schema enhancement failed', 'No enhanced schema returned');
            }
            return enhancementResult.enhancedSchema;
            
        } catch (error) {
            this.progress.schemaEnhancement = 'failed';
            log.error('Schema enhancement error details:', { error });
            throw error; // Re-throw to be caught by the main run() method
        }
    }

    private async validateSchema(enhancedSchema: any): Promise<any> {
        try {
            // Check if we have schema to validate
            if (!enhancedSchema) {
                handleError('Schema validation failed', 'No enhanced schema available. Either enable Step 3 (enhanceSchema) or provide existing enhanced schema.');
            }
            
            // Check if redash token is provided
            if (!this.input.redashToken?.trim()) {
                handleError('Schema validation failed', 'Redash API token is required for validation. Please provide redashToken.');
            }
            
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

            log.info(
                `Validation Summary: ${validationResult.summary.validDatasets}/${
                    validationResult.totalDatasets
                } datasets valid (${(validationResult.summary.successRate * 100).toFixed(1)}% success rate)`,
            );

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

            log.info('✅ Schema validation passed');
            return validationResult;
            
        } catch (error) {
            this.progress.schemaValidation = 'failed';
            throw error; // Re-throw to be caught by the main run() method
        }
    }

    private async createPR(enhancedSchema: any): Promise<{ success: boolean; prUrl?: string; error?: string; prInfo?: any }> {
        try {
            // Check if we have schema to create PR for
            if (!enhancedSchema) {
                handleError('PR creation failed', 'No enhanced schema available. Either enable Step 3 (enhanceSchema) or provide existing enhanced schema.');
            }
            
            // Check if GitHub credentials are provided
            if (!this.input.githubLink?.trim()) {
                handleError('PR creation failed', 'GitHub repository link is required for PR creation. Please provide githubLink.');
            }
            if (!this.input.githubToken?.trim()) {
                handleError('PR creation failed', 'GitHub token is required for PR creation. Please provide githubToken.');
            }
            
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

            log.info('✅ PR created successfully');
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

        // Validate step-specific requirements
        if (input!.validateSchema && !input!.redashToken) {
            handleError('Input validation failed', 'redashToken is required when validateSchema is enabled');
        }
        if (input!.createPR && (!input!.githubLink || !input!.githubToken)) {
            handleError('Input validation failed', 'githubLink and githubToken are required when createPR is enabled');
        }

        log.info('Starting Dataset Schema SuperActor...');

        const superActor = new DatasetSchemaSuperActor(input!);
        const result = await superActor.run();
        
        // Store results
        await Actor.setValue('OUTPUT', result);
        await Actor.pushData(result);

        await Actor.exit('Dataset Schema SuperActor completed');
    } catch (error) {
        log.error('💥 Actor execution failed:', { error });
        await Actor.fail(String(error));
    }
}

// Run the main function
main().catch((error) => {
    log.error('💥 Fatal error in main function:', { error });
    process.exit(1);
});
