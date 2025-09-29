import { Actor, ApifyClient } from 'apify';

interface TestInputConfig {
    minimalInput: Record<string, any>;
    normalInput: Record<string, any>;
    maximalInput: Record<string, any>;
    edgeInput: Record<string, any>;
    targetActorId: string;
}

interface RunResult {
    variant: string;
    success: boolean;
    datasetId?: string;
    error?: string;
    runId?: string;
}

interface SchemaGenerationResult {
    schema?: any;
    error?: string;
    generatedBy?: string;
    schemaDatasetId?: string;
}

// Centralized error handling
function handleError(context: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}:`, message);
    throw new Error(`${context}: ${message}`);
}

export class DatasetSchemaGenerator {
    private client: ApifyClient;

    constructor() {
        this.client = new ApifyClient({
            token: process.env.APIFY_TOKEN
        });
    }

    async runActorWithInputs(targetActorId: string, variants: {
        minimal: Record<string, any>;
        normal: Record<string, any>;
        maximal: Record<string, any>;
        edge: Record<string, any>;
    }): Promise<RunResult[]> {
        console.log(`Running Actor ${targetActorId} with 4 input variants in parallel...`);
        
        // Create parallel execution promises for all variants
        const runPromises = Object.entries(variants).map(async ([variantName, input]) => {
            try {
                console.log(`Starting ${variantName} input...`);
                
                const run = await this.client.actor(targetActorId).call(input, {
                    timeout: 300000, // 5 minutes timeout
                    memory: 2048
                });
                
                if (run && run.defaultDatasetId) {
                    console.log(`✅ ${variantName} run successful, dataset: ${run.defaultDatasetId}`);
                    return {
                        variant: variantName,
                        success: true,
                        datasetId: run.defaultDatasetId,
                        runId: run.id
                    };
                } else {
                    console.log(`❌ ${variantName} run failed: No dataset ID returned`);
                    return {
                        variant: variantName,
                        success: false,
                        error: 'No dataset ID returned',
                        runId: run?.id
                    };
                }
                
            } catch (error) {
                console.log(`❌ ${variantName} run failed:`, error);
                return {
                    variant: variantName,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        
        // Wait for all runs to complete in parallel
        const results = await Promise.all(runPromises);
        
        console.log(`All runs completed. Results: ${results.filter(r => r.success).length}/${results.length} successful`);
        
        return results;
    }

    validateRunResults(results: RunResult[]): {
        totalRuns: number;
        successfulRuns: number;
        overallSuccess: boolean;
        summary: string;
    } {
        const totalRuns = results.length;
        const successfulRuns = results.filter(r => r.success).length;
        // Changed: Accept any number of successful runs, focus on dataset collection
        const overallSuccess = successfulRuns > 0; // Need at least 1 successful run
        
        const summary = `${successfulRuns}/${totalRuns} runs successful`;
        
        return {
            totalRuns,
            successfulRuns,
            overallSuccess,
            summary
        };
    }

    async collectDatasetIds(results: RunResult[]): Promise<string[]> {
        // Collect datasets from both successful and failed runs
        const datasetIds: string[] = [];
        
        for (const result of results) {
            if (result.datasetId) {
                datasetIds.push(result.datasetId);
                console.log(`✅ Collected dataset from ${result.variant} run: ${result.datasetId}`);
            } else if (result.runId) {
                // Try to get dataset ID from failed run
                try {
                    const run = this.client.run(result.runId);
                    const runInfo = await run.get();
                    if (runInfo && runInfo.defaultDatasetId) {
                        datasetIds.push(runInfo.defaultDatasetId);
                        console.log(`✅ Collected dataset from failed ${result.variant} run: ${runInfo.defaultDatasetId}`);
                    }
                } catch (error) {
                    console.log(`❌ Could not collect dataset from failed ${result.variant} run: ${error}`);
                }
            }
        }
        
        console.log(`Total datasets collected: ${datasetIds.length}`);
        return datasetIds;
    }

    async generateDatasetSchema(datasetIds: string[], schemaGeneratorActorId: string): Promise<SchemaGenerationResult> {
        try {
            console.log(`Generating schema from ${datasetIds.length} datasets using Actor ${schemaGeneratorActorId}...`);
            
            const run = await this.client.actor(schemaGeneratorActorId).call({
                datasetIds: datasetIds
            }, {
                timeout: 300000, // 5 minutes timeout
                memory: 2048
            });
            
            if (!run || !run.defaultDatasetId) {
                return {
                    error: 'Schema generation run failed - no dataset returned'
                };
            }
            
            // Get the generated schema from the dataset
            const dataset = this.client.dataset(run.defaultDatasetId);
            const { items } = await dataset.listItems();
            
            if (!items || items.length === 0) {
                return {
                    error: 'No schema found in generated dataset'
                };
            }
            
            // Find the schema in the items
            const schemaItem = items.find(item => 
                item && typeof item === 'object' && 
                ('schema' in item || 'fields' in item || 'properties' in item)
            );
            
            if (!schemaItem) {
                return {
                    error: 'No valid schema found in dataset items'
                };
            }
            
            return {
                schema: schemaItem,
                generatedBy: schemaGeneratorActorId,
                schemaDatasetId: run.defaultDatasetId
            };
            
        } catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Unknown error during schema generation'
            };
        }
    }
}
