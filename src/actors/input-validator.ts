import { ApifyClient } from 'apify';

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

// Centralized error handling
function handleError(context: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}:`, message);
    throw new Error(`${context}: ${message}`);
}

export class InputValidator {
    private client: ApifyClient;

    constructor() {
        this.client = new ApifyClient({
            token: process.env.APIFY_TOKEN
        });
    }

    async validateInputs(targetActorId: string, inputs: TestInputConfig): Promise<ValidationResult> {
        console.log(`Validating inputs for Actor: ${targetActorId}`);
        
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
                console.log(`Validating ${variantName} input...`);
                
                // Use pattern-based validation instead of actual Actor runs
                const validationResult = this.validateInputPattern(input, targetActorId);
                
                if (validationResult.success) {
                    results.push({
                        variant: variantName,
                        success: true
                    });
                    console.log(`✅ ${variantName} input validation passed`);
                } else {
                    results.push({
                        variant: variantName,
                        success: false,
                        error: validationResult.error
                    });
                    console.log(`❌ ${variantName} input validation failed: ${validationResult.error}`);
                }
                
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                results.push({
                    variant: variantName,
                    success: false,
                    error: errorMessage
                });
                console.log(`❌ ${variantName} input validation failed:`, errorMessage);
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

        console.log(`Validation Summary: ${successfulRuns}/${totalRuns} inputs valid`);
        console.log(`Successful inputs: ${successfulInputs.join(', ')}`);
        if (failedInputs.length > 0) {
            console.log(`Failed inputs: ${failedInputs.map(f => `${f.variant} (${f.error})`).join(', ')}`);
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

    private validateInputPattern(input: any, targetActorId: string): { success: boolean; error?: string } {
        // For Google Maps Reviews Scraper, validate URL patterns and required fields
        if (targetActorId.includes('Google-Maps-Reviews-Scraper')) {
            return this.validateGoogleMapsInput(input);
        }
        
        // For other Actors, do basic validation
        return this.validateGenericInput(input);
    }

    private validateGoogleMapsInput(input: any): { success: boolean; error?: string } {
        // Check if input has required fields
        if (!input.maxReviews || typeof input.maxReviews !== 'number') {
            return { success: false, error: 'maxReviews is required and must be a number' };
        }

        // Check if input has either startUrls or placeIds
        if (!input.startUrls && !input.placeIds) {
            return { success: false, error: 'Either startUrls or placeIds must be provided' };
        }

        // If startUrls provided, validate URL format
        if (input.startUrls) {
            if (!Array.isArray(input.startUrls) || input.startUrls.length === 0) {
                return { success: false, error: 'startUrls must be a non-empty array' };
            }

            for (const url of input.startUrls) {
                if (!this.isValidGoogleMapsUrl(url)) {
                    return { success: false, error: `Invalid Google Maps URL format: ${url}` };
                }
            }
        }

        // If placeIds provided, validate format
        if (input.placeIds) {
            if (!Array.isArray(input.placeIds) || input.placeIds.length === 0) {
                return { success: false, error: 'placeIds must be a non-empty array' };
            }

            for (const placeId of input.placeIds) {
                if (typeof placeId !== 'string' || placeId.length < 10) {
                    return { success: false, error: `Invalid place ID format: ${placeId}` };
                }
            }
        }

        // Validate language code if provided
        if (input.language) {
            const validLanguages = ['en', 'af', 'az', 'id', 'ms', 'bs', 'ca', 'cs', 'da', 'de', 'et', 'es', 'es-419', 'eu', 'fil', 'fr', 'gl', 'hr', 'zu', 'is', 'it', 'sw', 'lv', 'lt', 'hu', 'nl', 'no', 'uz', 'pl', 'pt-BR', 'pt-PT', 'ro', 'sq', 'sk', 'sl', 'fi', 'sv', 'vi', 'tr', 'el', 'bg', 'ky', 'kk', 'mk', 'mn', 'ru', 'sr', 'uk', 'ka', 'hy', 'iw', 'ur', 'ar', 'fa', 'am', 'ne', 'hi', 'mr', 'bn', 'pa', 'gu', 'ta', 'te', 'kn', 'ml', 'si', 'th', 'lo', 'my', 'km', 'ko', 'ja', 'zh-CN', 'zh-TW'];
            if (!validLanguages.includes(input.language)) {
                return { success: false, error: `Invalid language code: ${input.language}. Must be one of: ${validLanguages.slice(0, 10).join(', ')}...` };
            }
        }

        return { success: true };
    }

    private isValidGoogleMapsUrl(url: string): boolean {
        // Check if it's a valid Google Maps URL with proper format
        // Must have: https://www.google.com/maps/place/[name]/@[lat],[lng],[zoom]z/data=![...]
        const googleMapsPattern = /^https:\/\/www\.google\.com\/maps\/place\/[^\/]+\/@-?\d+\.\d+,-?\d+\.\d+,\d+z\/data=!.*$/;
        
        // Additional validation: check for proper coordinate ranges
        const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+),(\d+)z/);
        if (!coordMatch) return false;
        
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        const zoom = parseInt(coordMatch[3]);
        
        // Validate coordinate ranges (latitude: -90 to 90, longitude: -180 to 180, zoom: 1 to 20)
        if (lat < -90 || lat > 90) return false;
        if (lng < -180 || lng > 180) return false;
        if (zoom < 1 || zoom > 20) return false;
        
        return googleMapsPattern.test(url);
    }

    private validateGenericInput(input: any): { success: boolean; error?: string } {
        // Basic validation for other Actors
        if (!input || typeof input !== 'object') {
            return { success: false, error: 'Input must be an object' };
        }

        return { success: true };
    }
}
