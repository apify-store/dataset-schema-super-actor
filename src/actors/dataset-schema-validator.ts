import { ApifyClient, log } from 'apify';

interface SchemaGenerationResult {
    success: boolean;
    schema?: any;
    error?: string;
    datasetsUsed: DatasetInfo[];
    validationDatasets: string[];
}

interface DatasetInfo {
    datasetId: string;
    itemCount: number;
    sampleData: any[];
}

interface ValidationInput {
    actorId: string;
    datasetSchema: object;
    redashApiKey: string;
    daysBack?: number;
    maximumResults?: number;
    minimumResults?: number;
    runsPerUser?: number;
    chartLimit?: number;
}

interface ValidationResult {
    datasetId: string;
    isValid: boolean;
    errors: string[];
    itemCount: number;
}

interface ValidatorOutput {
    actorId: string;
    totalDatasets: number;
    failedValidationResults: ValidationResult[];
    datasetsNotFound: string[];
    summary: {
        validDatasets: number;
        invalidDatasets: number;
        notFoundDatasets: number;
        successRate: number;
        totalItems: number;
    };
    queryParameters: {
        daysBack: number;
        maximumResults: number;
        minimumResults: number;
        runsPerUser: number;
    };
}

// Centralized error handling
function handleError(context: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`${context}:`, { message });
    throw new Error(`${context}: ${message}`);
}

export class DatasetSchemaValidator {
    private client: ApifyClient;

    constructor() {
        this.client = new ApifyClient({
            token: process.env.APIFY_TOKEN
        });
    }

    async processValidation(input: ValidationInput): Promise<ValidatorOutput> {
        log.info('Starting dataset schema validation process...');

        // Query Redash for dataset IDs
        const datasetIds = await this.queryRedashForDatasetIds(input);
        
        if (datasetIds.length === 0) {
            log.info('No datasets found for the given criteria');
            return {
                actorId: input.actorId,
                totalDatasets: 0,
                failedValidationResults: [],
                datasetsNotFound: [],
                summary: {
                    validDatasets: 0,
                    invalidDatasets: 0,
                    notFoundDatasets: 0,
                    successRate: 0,
                    totalItems: 0
                },
                queryParameters: {
                    daysBack: input.daysBack || 5,
                    maximumResults: input.maximumResults || 10,
                    minimumResults: input.minimumResults || 1,
                    runsPerUser: input.runsPerUser || 1
                }
            };
        }

        // Validate all datasets in a single call
        log.info(`Validating ${datasetIds.length} datasets in single call...`);

        try {
            const validationResult = await this.validateAllDatasets(datasetIds, input.datasetSchema);
            log.info(
                `Validation completed: ${validationResult.validDatasets} valid, ${validationResult.invalidDatasets} invalid, ${validationResult.notFoundDatasets} not found`,
            );

            return {
                actorId: input.actorId,
                totalDatasets: datasetIds.length,
                failedValidationResults: validationResult.failedResults,
                datasetsNotFound: validationResult.notFoundDatasets,
                summary: {
                    validDatasets: validationResult.validDatasets,
                    invalidDatasets: validationResult.invalidDatasets,
                    notFoundDatasets: validationResult.notFoundDatasets.length,
                    successRate: validationResult.successRate,
                    totalItems: validationResult.totalItems
                },
                queryParameters: {
                    daysBack: input.daysBack || 5,
                    maximumResults: input.maximumResults || 10,
                    minimumResults: input.minimumResults || 1,
                    runsPerUser: input.runsPerUser || 1
                }
            };
        } catch (error) {
            log.error('Validation failed:', { error });
            handleError('Validation failed', error);
        }
    }

    private async validateAllDatasets(datasetIds: string[], schema: object): Promise<{
        validDatasets: number;
        invalidDatasets: number;
        notFoundDatasets: string[];
        successRate: number;
        totalItems: number;
        failedResults: ValidationResult[];
    }> {
        try {
            log.info(`Calling validation Actor with ${datasetIds.length} dataset IDs...`);

            // Call the validation actor with all dataset IDs at once
            const validationRun = await this.client.actor('jaroslavhejlek/validate-dataset-with-json-schema').call({
                datasetIds: datasetIds,
                schema: schema
            });

            // Get validation results
            const { defaultDatasetId } = validationRun;
            const validationDataset = this.client.dataset(defaultDatasetId);
            const { items: validationResults } = await validationDataset.listItems();

            log.info(`Validation Actor returned ${validationResults.length} results`);

            // If validation Actor returns 0 results, it means all datasets passed validation
            if (validationResults.length === 0) {
                log.info('Validation Actor returned 0 results - all datasets passed validation');
                return {
                    validDatasets: datasetIds.length,
                    invalidDatasets: 0,
                    notFoundDatasets: [],
                    successRate: 1.0,
                    totalItems: 0, // We don't know the total items count, but validation passed
                    failedResults: []
                };
            }

            // Process results
            const validDatasets = validationResults.filter((result: any) => result.isValid).length;
            const invalidDatasets = validationResults.filter((result: any) => !result.isValid).length;
            const notFoundDatasets: string[] = [];
            const failedResults: ValidationResult[] = [];
            let totalItems = 0;

            for (const result of validationResults) {
                const itemCount = typeof result.itemCount === 'number' ? result.itemCount : 0;
                totalItems += itemCount;
                
                const errors = Array.isArray(result.errors) ? result.errors : [];
                const datasetId = typeof result.datasetId === 'string' ? result.datasetId : 'unknown';
                
                if (errors.some((error: string) => error.includes('Dataset was not found'))) {
                    notFoundDatasets.push(datasetId);
                } else if (!result.isValid) {
                    failedResults.push({
                        datasetId: datasetId,
                        isValid: false,
                        itemCount: itemCount,
                        errors: errors.length > 0 ? errors : ['Unknown validation error']
                    });
                }
            }

            const successRate = validationResults.length > 0 ? validDatasets / validationResults.length : 0;

            return {
                validDatasets,
                invalidDatasets,
                notFoundDatasets,
                successRate,
                totalItems,
                failedResults
            };

        } catch (error) {
            log.error('Validation failed:', { error });
            handleError('Validation failed', error);
        }
    }

    private async resolveActorId(technicalName: string): Promise<string> {
        try {
            log.info(`Resolving technical name "${technicalName}" to Actor ID...`);

            // Use Apify SDK to get Actor details
            const actor = this.client.actor(technicalName);
            const actorData = await actor.get();
            
            if (!actorData || !actorData.id) {
                throw new Error(`No Actor ID found for technical name: ${technicalName}`);
            }

            log.info(`Resolved "${technicalName}" to Actor ID: ${actorData.id}`);
            return actorData.id;
        } catch (error) {
            log.error('Actor ID resolution failed:', { error });
            throw error;
        }
    }

    private async queryRedashForDatasetIds(input: ValidationInput): Promise<string[]> {
        try {
            const {
                actorId: technicalName,
                redashApiKey,
                daysBack = 5,
                maximumResults = 10,
                minimumResults = 1,
                runsPerUser = 1,
                chartLimit = 1000
            } = input;

            // Resolve technical name to Actor ID
            const actorId = await this.resolveActorId(technicalName);
            log.info(`Querying Redash for actor ${actorId} (${technicalName})...`);

            // Step 1: Try to get cached results first
            const cachedUrl = `https://charts.apify.com/api/queries/2039/results.json?api_key=${redashApiKey}&actor_id=${actorId}&days_back=${daysBack}&maximum_results=${maximumResults}&minimum_results=${minimumResults}&runs_per_user=${runsPerUser}&limit=${chartLimit}`;
            log.info(`Trying cached results first: ${cachedUrl}`);

            let executeResponse = await fetch(cachedUrl, {
                headers: {
                    'Authorization': `Key ${redashApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // If no cached results, execute the query
            if (!executeResponse.ok || executeResponse.status === 404) {
                log.info('No cached results, executing query...');
                const executeUrl = `https://charts.apify.com/api/queries/2039/results`;
                log.info(`Executing query at: ${executeUrl}`);

                executeResponse = await fetch(executeUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Key ${redashApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        parameters: {
                            "actor_id": actorId,
                            "runs_per_user": runsPerUser.toString(),
                            "days_back": daysBack.toString(),
                            "minimum_results": minimumResults.toString(),
                            "maximum_results": maximumResults.toString(),
                            "limit": chartLimit.toString()
                        },
                        max_age: 0
                    })
                });
            }

            if (!executeResponse.ok) {
                const errorText = await executeResponse.text();
                log.error(`Query execute error: ${errorText}`);
                handleError('Failed to execute query', `HTTP error! status: ${executeResponse.status}, response: ${errorText}`);
            }

            const executeData = await executeResponse.json();
            log.info('Query execute response:', executeData);

            // Check if we got cached results directly
            if (executeData?.query_result?.data?.rows) {
                log.info('Got cached results directly');
                const datasetIds = executeData.query_result.data.rows.map((row: any) => row.default_dataset_id || row.dataset_id || row.id).filter(Boolean);
                log.info(`Found ${datasetIds.length} dataset IDs:`, datasetIds);
                return datasetIds;
            }

            // Step 2: Poll for job completion
            const jobId = executeData.job?.id;
            if (!jobId) {
                handleError('Job ID not found', 'No job ID in execute response');
            }

            log.info(`Polling job ${jobId} for completion...`);
            let jobCompleted = false;
            let attempts = 0;
            const maxAttempts = 30; // 5 minutes max

            while (!jobCompleted && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
                attempts++;

                const jobUrl = `https://charts.apify.com/api/jobs/${jobId}`;
                const jobResponse = await fetch(jobUrl, {
                    headers: {
                        'Authorization': `Key ${redashApiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!jobResponse.ok) {
                    const errorText = await jobResponse.text();
                    log.error(`Job status error: ${errorText}`);
                    continue;
                }

                const jobData = await jobResponse.json();
                log.info(`Job status attempt ${attempts}:`, jobData.job?.status);

                if (jobData.job?.status === 3) { // Success
                    jobCompleted = true;
                    log.info('Job completed successfully');
                    // Store the job data for later use
                    executeData.job = jobData.job;
                } else if (jobData.job?.status === 4) { // Error
                    handleError('Redash job failed', `Job failed with status: ${jobData.job?.status}`);
                }
            }

            if (!jobCompleted) {
                handleError('Redash job timeout', 'Job did not complete within timeout period');
            }

            // Step 3: Get the results
            const queryResultId = executeData.job?.query_result_id;
            if (!queryResultId) {
                handleError('Query result ID not found', 'No query result ID in execute response');
            }

            const resultsUrl = `https://charts.apify.com/api/query_results/${queryResultId}.json?api_key=${redashApiKey}`;
            log.info(`Fetching results from: ${resultsUrl}`);

            const resultsResponse = await fetch(resultsUrl, {
                headers: {
                    'Authorization': `Key ${redashApiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!resultsResponse.ok) {
                const errorText = await resultsResponse.text();
                log.error(`Results fetch error: ${errorText}`);
                handleError('Redash results fetch failed', `HTTP error! status: ${resultsResponse.status}, response: ${errorText}`);
            }

            const resultsData = await resultsResponse.json();
            log.info('Query results:', resultsData);

            if (!resultsData?.query_result?.data?.rows) {
                handleError('Redash results validation failed', 'Invalid results structure');
            }

            const datasetIds = resultsData.query_result.data.rows.map((row: any) => row.default_dataset_id || row.dataset_id || row.id).filter(Boolean);

            log.info(`Found ${datasetIds.length} dataset IDs:`, datasetIds);
            return datasetIds;
        } catch (error) {
            log.error('Redash query error details:', { error });
            handleError('Redash query failed', error);
        }
    }

    async generateSchemaFromDatasets(input: ValidationInput): Promise<SchemaGenerationResult> {
        try {
            log.info('Starting schema generation from Redash datasets...');

            // Query Redash for dataset IDs (reuse existing logic)
            const datasetIds = await this.queryRedashForDatasetIds(input);
            
            if (datasetIds.length === 0) {
                return {
                    success: false,
                    error: `No datasets found for Actor ${input.actorId}. Please ensure the Actor has recent dataset activity or use the test input method instead.`,
                    datasetsUsed: [],
                    validationDatasets: []
                };
            }

            log.info(`Found ${datasetIds.length} datasets for schema generation`);

            // Split datasets randomly 50/50
            const { generationDatasets, validationDatasets } = this.splitDatasetsRandomly(datasetIds);
            
            log.info(`Using ${generationDatasets.length} datasets for generation, ${validationDatasets.length} for validation`);

            // Sample data from generation datasets (50% of each)
            const datasetsWithSamples: DatasetInfo[] = [];
            
            for (const datasetId of generationDatasets) {
                try {
                    const datasetInfo = await this.sampleDatasetData(datasetId);
                    datasetsWithSamples.push(datasetInfo);
                    log.info(`Sampled ${datasetInfo.sampleData.length} records from dataset ${datasetId}`);
                } catch (error) {
                    log.error(`Failed to sample dataset ${datasetId}:`, { error });
                    // Continue with other datasets
                }
            }

            if (datasetsWithSamples.length === 0) {
                return {
                    success: false,
                    error: 'Failed to sample data from any datasets. Please check dataset accessibility.',
                    datasetsUsed: [],
                    validationDatasets
                };
            }

            // Generate schema from combined samples
            const schema = await this.generateSchemaFromSamples(datasetsWithSamples);

            log.info('Schema generated successfully from Redash datasets');

            return {
                success: true,
                schema,
                datasetsUsed: datasetsWithSamples,
                validationDatasets
            };

        } catch (error) {
            log.error('Error in schema generation from Redash datasets:', { error });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during schema generation',
                datasetsUsed: [],
                validationDatasets: []
            };
        }
    }

    private splitDatasetsRandomly(datasetIds: string[]): { generationDatasets: string[], validationDatasets: string[] } {
        // Shuffle array randomly
        const shuffled = [...datasetIds].sort(() => Math.random() - 0.5);
        
        // Split 50/50
        const midPoint = Math.floor(shuffled.length / 2);
        
        return {
            generationDatasets: shuffled.slice(0, midPoint),
            validationDatasets: shuffled.slice(midPoint)
        };
    }

    private async sampleDatasetData(datasetId: string): Promise<DatasetInfo> {
        try {
            // Get dataset info
            const dataset = await this.client.dataset(datasetId).get();
            const totalItems = dataset?.itemCount || 0;
            
            if (totalItems === 0) {
                throw new Error('Dataset is empty');
            }

            // Calculate sample size (50% of dataset, max 1000 records)
            const sampleSize = Math.min(Math.floor(totalItems * 0.5), 1000);
            
            log.info(`Sampling ${sampleSize} records from dataset ${datasetId} (total: ${totalItems})`);

            // Get sample data
            const { items } = await this.client.dataset(datasetId).listItems({
                limit: sampleSize,
                offset: 0
            });

            return {
                datasetId,
                itemCount: totalItems,
                sampleData: items || []
            };

        } catch (error) {
            log.error(`Error sampling dataset ${datasetId}:`, { error });
            throw error;
        }
    }

    private async generateSchemaFromSamples(datasetsWithSamples: DatasetInfo[]): Promise<any> {
        try {
            if (datasetsWithSamples.length === 0) {
                throw new Error('No datasets with samples available for schema generation');
            }

            // Extract dataset IDs from the datasets that have samples
            const datasetIds = datasetsWithSamples.map(dataset => dataset.datasetId);
            
            log.info(`Generating schema from ${datasetIds.length} datasets with samples`);

            // Use the existing schema generator Actor
            const schemaGeneratorActorId = 'kMFja3BjKqZiO7pGc'; // This should be the actual schema generator Actor ID
            
            // Call the schema generator Actor with the dataset IDs
            const run = await this.client.actor(schemaGeneratorActorId).call({
                datasetIds: datasetIds
            }, {
                timeout: 300000, // 5 minutes timeout
            });

            if (!run.defaultDatasetId) {
                throw new Error('Schema generator Actor did not produce a dataset');
            }

            // Get the generated schema from the dataset
            const { items } = await this.client.dataset(run.defaultDatasetId).listItems();
            
            if (!items || items.length === 0) {
                throw new Error('No schema generated by the schema generator Actor');
            }

            // The first item should contain the schema
            const schema = items[0];
            
            log.info('Schema generated successfully from dataset IDs');
            return schema;

        } catch (error) {
            log.error('Error generating schema from samples:', { error });
            throw error;
        }
    }
}
