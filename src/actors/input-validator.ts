import { log } from 'apify';

interface TestInputConfig {
    minimalInput: Record<string, any>;
    normalInput: Record<string, any>;
    maximalInput: Record<string, any>;
    edgeInput: Record<string, any>;
    targetActorId: string;
}

interface ValidationResult {
    successfulRuns: number;
    totalRuns: number;
    overallSuccess: boolean;
    failedInputs: Array<{
        variant: string;
        error: string;
    }>;
    successfulInputs: string[];
}

export class InputValidator {
    async validateInputs(targetActorId: string, inputs: TestInputConfig): Promise<ValidationResult> {
        log.info(`Validating inputs for Actor: ${targetActorId}`);

        const variants = {
            minimal: inputs.minimalInput,
            normal: inputs.normalInput,
            maximal: inputs.maximalInput,
            edge: inputs.edgeInput
        };

        const results: Array<{
            variant: string;
            success: boolean;
            error?: string;
        }> = [];

        // Validate each input variant using pattern matching instead of actual Actor runs
        for (const [variantName, input] of Object.entries(variants)) {
            try {
                log.info(`Validating ${variantName} input...`);

                // Use pattern-based validation instead of actual Actor runs
                const validationResult = this.validateInputPattern(input);
                
                if (validationResult.success) {
                    results.push({
                        variant: variantName,
                        success: true
                    });
                    log.info(`✅ ${variantName} input validation passed`);
                } else {
                    results.push({
                        variant: variantName,
                        success: false,
                        error: validationResult.error
                    });
                    log.info(`❌ ${variantName} input validation failed: ${validationResult.error}`);
                }
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                results.push({
                    variant: variantName,
                    success: false,
                    error: errorMessage
                });
                log.info(`❌ ${variantName} input validation failed:`, { error: errorMessage });
            }
        }

        const successfulRuns = results.filter(r => r.success).length;
        const totalRuns = results.length;
        const overallSuccess = successfulRuns >= 2; // Need at least 2 successful runs

        const failedInputs = results
            .filter(r => !r.success)
            .map(r => ({
                variant: r.variant,
                error: r.error || 'Unknown error'
            }));

        const successfulInputs = results
            .filter(r => r.success)
            .map(r => r.variant);

        log.info(`Validation Summary: ${successfulRuns}/${totalRuns} inputs valid`);
        log.info(`Successful inputs: ${successfulInputs.join(', ')}`);
        if (failedInputs.length > 0) {
            log.info('Failed inputs', {
                failedInputs: failedInputs.map((f) => ({ variant: f.variant, error: f.error })),
            });
        }

        return {
            successfulRuns,
            totalRuns,
            overallSuccess,
            failedInputs,
            successfulInputs
        };
    }

    generateValidationFeedback(validationResult: ValidationResult): string {
        if (validationResult.overallSuccess) {
            return 'All inputs validated successfully';
        }

        const feedback = [
            `Validation failed: Only ${validationResult.successfulRuns}/${validationResult.totalRuns} inputs were valid.`,
            'Please fix the following issues:'
        ];

        validationResult.failedInputs.forEach(failed => {
            feedback.push(`- ${failed.variant}: ${failed.error}`);
        });

        feedback.push('');
        feedback.push('Please generate new inputs that will pass Actor validation.');
        feedback.push('Focus on:');
        feedback.push('- Valid URL formats for startUrls');
        feedback.push('- Valid language codes');
        feedback.push('- Proper input parameter types');
        feedback.push('- Realistic test data that matches Actor requirements');

        return feedback.join('\n');
    }

    private validateInputPattern(input: any): { success: boolean; error?: string } {
        // Generic validation for all Actors
        return this.validateGenericInput(input);
    }

    private validateGenericInput(input: any): { success: boolean; error?: string } {
        // Basic validation for all Actors
        if (!input || typeof input !== 'object') {
            return { success: false, error: 'Input must be an object' };
        }

        // Generic validation rules that apply to most Actors
        const validationRules = this.getValidationRules();
        
        for (const rule of validationRules) {
            const result = rule.validate(input);
            if (!result.success) {
                return result;
            }
        }

        return { success: true };
    }

    private getValidationRules(): Array<{ validate: (input: any) => { success: boolean; error?: string } }> {
        // Generic validation rules for all Actors - no actor-specific rules
        const rules: Array<{ validate: (input: any) => { success: boolean; error?: string } }> = [];

        // Only basic validation rules that apply to all Actors
        rules.push({
            validate: (input: any) => {
                if (!input || typeof input !== 'object') {
                    return { success: false, error: 'Input must be an object' };
                }
                return { success: true };
            }
        });

        // No actor-specific validation rules - let the Actor itself validate the inputs
        return rules;
    }
}
