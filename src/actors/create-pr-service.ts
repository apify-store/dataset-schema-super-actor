import { Octokit } from '@octokit/rest';

export interface CreatePRInput {
    datasetSchema: any;
    githubLink: string;
    githubToken: string;
    generateViews?: boolean;
    actorTechnicalName?: string;
}

export interface CreatePROutput {
    success: boolean;
    prUrl?: string;
    error?: string;
    prInfo?: any;
}

export interface GitHubRepository {
    owner: string;
    repo: string;
}

export interface CreatePRRequest {
    title: string;
    body: string;
    head: string;
    base: string;
}

export interface GitHubPR {
    id: number;
    number: number;
    title: string;
    body: string;
    state: string;
    html_url: string;
    created_at: string;
    updated_at: string;
}

export interface DatasetField {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date';
    required: boolean;
    description?: string;
    example?: any;
}

// Centralized error handling
function handleError(context: string, error: unknown): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`${context}:`, message);
    throw new Error(`${context}: ${message}`);
}

export class CreatePRService {
    private input: CreatePRInput;
    private octokit: Octokit;

    constructor(input: CreatePRInput) {
        this.input = input;
        this.octokit = new Octokit({
            auth: input.githubToken,
            userAgent: 'Apify-Dataset-Schema-SuperActor/1.0.0'
        });
    }

    async run(): Promise<CreatePROutput> {
        try {
            console.log('Starting Create PR Service...');
            console.log('Input:', JSON.stringify(this.input, null, 2));

            const details: any = {};

            // Step 1: Parse GitHub URL
            console.log('Step 1: Parsing GitHub URL...');
            const repoInfo = this.parseGitHubUrl(this.input.githubLink);
            if (!repoInfo) {
                throw new Error('Invalid GitHub URL provided');
            }
            console.log('Repository:', `${repoInfo.owner}/${repoInfo.repo}`);

            // Step 2: Get default branch and fetch existing actor.json from GitHub
            console.log('Step 2: Getting default branch...');
            const defaultBranch = await this.getDefaultBranch(repoInfo.owner, repoInfo.repo);
            console.log('Default branch:', defaultBranch);

            console.log('Step 3: Finding actor.json in monorepo...');
            const actorJsonResponse = await this.findActorJson(
                repoInfo.owner,
                repoInfo.repo,
                defaultBranch
            );
            
            const originalActorJsonContent = actorJsonResponse.content;
            const actorJsonPath = actorJsonResponse.path;
            console.log('Found actor.json at:', actorJsonPath);
            
            // Parse to get basic info for logging
            const originalActorJson = JSON.parse(originalActorJsonContent);
            console.log('Original actor.json loaded:', originalActorJson.name);

            // Step 4: Extract views from original actor.json
            console.log('Step 4: Extracting views from original actor.json...');
            let originalViews: any = null;
            if (originalActorJson.storages?.dataset?.views) {
                originalViews = originalActorJson.storages.dataset.views;
                console.log('Found views in original actor.json:', Object.keys(originalViews));
            } else {
                console.log('No views found in original actor.json');
            }

            // Step 5: Process dataset schema
            console.log('Step 5: Processing dataset schema...');
            console.log('Dataset schema input:', JSON.stringify(this.input.datasetSchema, null, 2));
            
            // Check if input is already a complete JSON Schema or needs conversion
            let datasetSchema: any;
            
            if (this.input.datasetSchema.properties && this.input.datasetSchema.type === 'object') {
                // Input is already a complete JSON Schema
                console.log('Input is a complete JSON Schema, using directly');

                // Create dataset schema with original views (if available) or generate new ones
                if (originalViews) {
                    console.log('Using original views from actor.json');
                    datasetSchema = this.generateDatasetSchemaFromJsonSchema(this.input.datasetSchema, originalViews);
                } else {
                    console.log('Generating new views from input schema');
                    const fieldsForViews = Object.entries(this.input.datasetSchema.properties).map(([name, prop]: [string, any]) => ({
                        name,
                        type: Array.isArray(prop.type) ? prop.type[0] : prop.type,
                        required: this.input.datasetSchema.required?.includes(name) || false,
                        description: prop.description || `The ${name} field`,
                        example: prop.example
                    }));
                    const views = this.generateViewsFromFields(fieldsForViews);
                    datasetSchema = this.generateDatasetSchemaFromJsonSchema(this.input.datasetSchema, views);
                }
            } else if (this.input.datasetSchema.fields && Array.isArray(this.input.datasetSchema.fields)) {
                // Input has fields array, convert to JSON Schema
                console.log('Input has fields array, converting to JSON Schema');

                // Create dataset schema with original views (if available) or generate new ones
                if (originalViews) {
                    console.log('Using original views from actor.json');
                    datasetSchema = this.generateDatasetSchema(this.input.datasetSchema, originalViews);
                } else {
                    console.log('Generating new views from input fields');
                    const views = this.generateViewsFromFields(this.input.datasetSchema.fields);
                    datasetSchema = this.generateDatasetSchema(this.input.datasetSchema, views);
                }
            } else if (this.input.datasetSchema.fields && this.input.datasetSchema.fields.properties) {
                // Input has fields.properties structure (from LLM Schema Enhancer)
                console.log('Input has fields.properties structure, converting to JSON Schema');

                // Extract the properties from fields.properties
                const jsonSchema = {
                    type: 'object',
                    properties: this.input.datasetSchema.fields.properties,
                    required: this.input.datasetSchema.fields.required || [],
                    additionalProperties: this.input.datasetSchema.fields.additionalProperties || true,
                    $schema: this.input.datasetSchema.fields.$schema || 'http://json-schema.org/draft-07/schema#'
                };

                // Create dataset schema with original views (if available) or generate new ones
                if (originalViews) {
                    console.log('Using original views from actor.json');
                    datasetSchema = this.generateDatasetSchemaFromJsonSchema(jsonSchema, originalViews);
                } else {
                    console.log('Generating new views from input schema');
                    const fieldsForViews = Object.entries(jsonSchema.properties).map(([name, prop]: [string, any]) => ({
                        name,
                        type: Array.isArray(prop.type) ? prop.type[0] : prop.type,
                        required: jsonSchema.required?.includes(name) || false,
                        description: prop.description || `The ${name} field`,
                        example: prop.example
                    }));
                    const views = this.generateViewsFromFields(fieldsForViews);
                    datasetSchema = this.generateDatasetSchemaFromJsonSchema(jsonSchema, views);
                }
            } else {
                throw new Error('Invalid dataset schema input: must be either a complete JSON Schema with properties or an object with fields array');
            }
            
            details.datasetSchema = datasetSchema;
            console.log('Dataset schema processed with', Object.keys(datasetSchema.fields.properties).length, 'fields');

            // Step 6: Update actor.json surgically (preserving formatting)
            console.log('Step 6: Updating actor.json surgically...');
            const updatedActorJsonContent = this.updateActorJsonSurgically(originalActorJsonContent);
            const updatedActorJson = JSON.parse(updatedActorJsonContent);
            details.actorJson = updatedActorJson;
            console.log('Actor.json updated surgically with dataset reference');

            // Step 7: Create new branch
            const branchName = `dataset-from-ai-${Date.now()}`;
            console.log(`Step 7: Creating ${branchName} branch...`);
            await this.createBranch(
                repoInfo.owner,
                repoInfo.repo,
                branchName,
                defaultBranch
            );
            console.log(`Branch ${branchName} created`);

            // Step 8: Commit files to the new branch
            console.log('Step 8: Committing files...');
            // Ensure dataset_schema.json is placed in the same directory as actor.json
            const datasetSchemaPath = actorJsonPath.replace(/actor\.json$/, 'dataset_schema.json');
            console.log('Dataset schema will be created at:', datasetSchemaPath);
            
            const files = [
                {
                    path: actorJsonPath,
                    content: updatedActorJsonContent
                },
                {
                    path: datasetSchemaPath,
                    content: JSON.stringify(datasetSchema, null, 2)
                }
            ];

            console.log('Files prepared for commit:');
            files.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file.path}`);
                console.log(`     Content length: ${file.content.length} characters`);
                console.log(`     Content preview: ${file.content.substring(0, 150)}...`);
            });

            await this.commitFiles(
                repoInfo.owner,
                repoInfo.repo,
                branchName,
                files,
                `Add dataset schema for ${originalActorJson.name || 'actor'}

- Add dataset_schema.json with field definitions and views
- Update actor.json to reference dataset schema
- Remove views from actor.json (moved to dataset schema)`
            );

            console.log('Files committed successfully');

            // Step 9: Create pull request
            console.log('Step 9: Creating pull request...');
            const prResult = await this.createPullRequest(
                repoInfo.owner,
                repoInfo.repo,
                {
                    title: `Add dataset schema: ${originalActorJson.name || 'Actor'}`,
                    body: `This PR adds a dataset schema for the actor.\n\n**Changes:**\n- Added \`dataset_schema.json\` with field definitions\n- Updated \`actor.json\` to reference the dataset schema\n- Added views configuration for the dataset\n\n**Generated by Apify Dataset Schema SuperActor**`,
                    head: branchName,
                    base: defaultBranch
                }
            );

            details.prInfo = prResult;
            console.log('PR created successfully:', prResult.html_url);

            return {
                success: true,
                prUrl: prResult.html_url,
                prInfo: prResult
            };
        } catch (error) {
            console.error('Create PR Service failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private parseGitHubUrl(url: string): GitHubRepository | null {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(part => part);
            
            if (pathParts.length >= 2) {
                return {
                    owner: pathParts[0],
                    repo: pathParts[1]
                };
            }
            return null;
        } catch (error) {
            console.error('Failed to parse GitHub URL:', error);
            return null;
        }
    }

    private async getDefaultBranch(owner: string, repo: string): Promise<string> {
        try {
            const response = await this.octokit.rest.repos.get({
                owner,
                repo
            });
            return response.data.default_branch;
        } catch (error) {
            handleError('Failed to get default branch', error);
        }
    }

    private async findActorJson(owner: string, repo: string, branch: string): Promise<{ content: string; path: string }> {
        try {
            console.log(`Searching for actor.json in ${owner}/${repo} on branch ${branch}`);

            // First, let's see what's in the root directory
            try {
                const rootResponse = await this.octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path: '',
                    ref: branch
                });

                if (Array.isArray(rootResponse.data)) {
                    console.log('Root directory contents:', rootResponse.data.map(item => `${item.type}: ${item.name}`).join(', '));
                }
            } catch (error) {
                console.log('Could not list root directory:', error);
            }

            // Search in all possible locations
            const searchPaths = [
                'actor.json',
                '.actor/actor.json',
                'src/actor.json',
                'lib/actor.json',
                'dist/actor.json',
                'build/actor.json'
            ];

            console.log('Searching in common locations...');
            for (const searchPath of searchPaths) {
                try {
                    console.log(`Checking: ${searchPath}`);
                    const response = await this.octokit.rest.repos.getContent({
                        owner,
                        repo,
                        path: searchPath,
                        ref: branch
                    });

                    if (!Array.isArray(response.data) && response.data.type === 'file') {
                        console.log(`Found actor.json at: ${searchPath}`);
                        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                        return { content, path: searchPath };
                    }
                } catch (error) {
                    console.log(`Not found: ${searchPath}`);
                }
            }

            // Search in packages directory
            console.log('Searching in packages directory...');
            try {
                const packagesResponse = await this.octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path: 'packages',
                    ref: branch
                });

                if (Array.isArray(packagesResponse.data)) {
                    console.log('Packages found:', packagesResponse.data.map(item => item.name).join(', '));
                    for (const item of packagesResponse.data) {
                        if (item.type === 'dir') {
                            const actorJsonPath = `packages/${item.name}/actor.json`;
                            try {
                                console.log(`Checking: ${actorJsonPath}`);
                                const response = await this.octokit.rest.repos.getContent({
                                    owner,
                                    repo,
                                    path: actorJsonPath,
                                    ref: branch
                                });

                                if (!Array.isArray(response.data) && response.data.type === 'file') {
                                    console.log(`Found actor.json at: ${actorJsonPath}`);
                                    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                                    return { content, path: actorJsonPath };
                                }
                            } catch (error) {
                                console.log(`Not found: ${actorJsonPath}`);
                            }
                        }
                    }
                }
            } catch (error) {
                console.log('Packages directory not found or accessible');
            }

            // Search in apps directory
            console.log('Searching in apps directory...');
            try {
                const appsResponse = await this.octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path: 'apps',
                    ref: branch
                });

                if (Array.isArray(appsResponse.data)) {
                    console.log('Apps found:', appsResponse.data.map(item => item.name).join(', '));
                    for (const item of appsResponse.data) {
                        if (item.type === 'dir') {
                            const actorJsonPath = `apps/${item.name}/actor.json`;
                            try {
                                console.log(`Checking: ${actorJsonPath}`);
                                const response = await this.octokit.rest.repos.getContent({
                                    owner,
                                    repo,
                                    path: actorJsonPath,
                                    ref: branch
                                });

                                if (!Array.isArray(response.data) && response.data.type === 'file') {
                                    console.log(`Found actor.json at: ${actorJsonPath}`);
                                    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                                    return { content, path: actorJsonPath };
                                }
                            } catch (error) {
                                console.log(`Not found: ${actorJsonPath}`);
                            }
                        }
                    }
                }
            } catch (error) {
                console.log('Apps directory not found or accessible');
            }

            // Search in actors directory (Apify store structure)
            console.log('Searching in actors directory...');
            try {
                const actorsResponse = await this.octokit.rest.repos.getContent({
                    owner,
                    repo,
                    path: 'actors',
                    ref: branch
                });

                if (Array.isArray(actorsResponse.data)) {
                    console.log('Actors found:', actorsResponse.data.map(item => item.name).join(', '));
                    for (const item of actorsResponse.data) {
                        if (item.type === 'dir') {
                            // Check for .actor/actor.json in each actor directory
                            const actorJsonPath = `actors/${item.name}/.actor/actor.json`;
                            try {
                                console.log(`Checking: ${actorJsonPath}`);
                                const response = await this.octokit.rest.repos.getContent({
                                    owner,
                                    repo,
                                    path: actorJsonPath,
                                    ref: branch
                                });

                                if (!Array.isArray(response.data) && response.data.type === 'file') {
                                    console.log(`Found actor.json at: ${actorJsonPath}`);
                                    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                                    return { content, path: actorJsonPath };
                                }
                            } catch (error) {
                                console.log(`Not found: ${actorJsonPath}`);
                            }

                            // Also check for actor.json directly in the actor directory
                            const directActorJsonPath = `actors/${item.name}/actor.json`;
                            try {
                                console.log(`Checking: ${directActorJsonPath}`);
                                const response = await this.octokit.rest.repos.getContent({
                                    owner,
                                    repo,
                                    path: directActorJsonPath,
                                    ref: branch
                                });

                                if (!Array.isArray(response.data) && response.data.type === 'file') {
                                    console.log(`Found actor.json at: ${directActorJsonPath}`);
                                    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                                    return { content, path: actorJsonPath };
                                }
                            } catch (error) {
                                console.log(`Not found: ${directActorJsonPath}`);
                            }
                        }
                    }
                }
            } catch (error) {
                console.log('Actors directory not found or accessible');
            }

            // Search in other common monorepo directories
            const otherDirs = ['libs', 'modules', 'services', 'components'];
            for (const dir of otherDirs) {
                console.log(`Searching in ${dir} directory...`);
                try {
                    const dirResponse = await this.octokit.rest.repos.getContent({
                        owner,
                        repo,
                        path: dir,
                        ref: branch
                    });

                    if (Array.isArray(dirResponse.data)) {
                        console.log(`${dir} found:`, dirResponse.data.map(item => item.name).join(', '));
                        for (const item of dirResponse.data) {
                            if (item.type === 'dir') {
                                const actorJsonPath = `${dir}/${item.name}/actor.json`;
                                try {
                                    console.log(`Checking: ${actorJsonPath}`);
                                    const response = await this.octokit.rest.repos.getContent({
                                        owner,
                                        repo,
                                        path: actorJsonPath,
                                        ref: branch
                                    });

                                    if (!Array.isArray(response.data) && response.data.type === 'file') {
                                        console.log(`Found actor.json at: ${actorJsonPath}`);
                                        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                                        return { content, path: actorJsonPath };
                                    }
                                } catch (error) {
                                    console.log(`Not found: ${actorJsonPath}`);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.log(`${dir} directory not found or accessible`);
                }
            }

            throw new Error('actor.json file not found in any common locations. Please ensure the repository contains an actor.json file.');
        } catch (error) {
            handleError('Failed to find actor.json', error);
        }
    }

    private async createBranch(owner: string, repo: string, branchName: string, fromBranch: string): Promise<void> {
        try {
            // Get the SHA of the from branch
            const fromBranchRef = await this.octokit.rest.repos.getBranch({
                owner,
                repo,
                branch: fromBranch
            });

            // Create new branch
            await this.octokit.rest.git.createRef({
                owner,
                repo,
                ref: `refs/heads/${branchName}`,
                sha: fromBranchRef.data.commit.sha
            });
        } catch (error) {
            handleError('Failed to create branch', error);
        }
    }

    private async commitFiles(
        owner: string,
        repo: string,
        branch: string,
        files: Array<{ path: string; content: string }>,
        message: string
    ): Promise<void> {
        try {
            console.log(`Committing ${files.length} files to branch ${branch}:`);
            files.forEach((file, index) => {
                console.log(`  File ${index + 1}: ${file.path} (${file.content.length} chars)`);
                console.log(`    Preview: ${file.content.substring(0, 100)}...`);
            });

            const tree = [];
            const blobs = [];

            // Create blobs for each file
            for (const file of files) {
                console.log(`Creating blob for ${file.path}...`);
                const blob = await this.octokit.rest.git.createBlob({
                    owner,
                    repo,
                    content: Buffer.from(file.content).toString('base64'),
                    encoding: 'base64'
                });
                console.log(`Blob created for ${file.path}: ${blob.data.sha}`);
                blobs.push(blob.data);

                tree.push({
                    path: file.path,
                    mode: '100644' as const,
                    type: 'blob' as const,
                    sha: blob.data.sha
                });
            }

            // Get the current commit
            console.log(`Getting current commit for branch ${branch}...`);
            const currentCommit = await this.octokit.rest.repos.getCommit({
                owner,
                repo,
                ref: branch
            });
            console.log(`Current commit: ${currentCommit.data.sha}`);

            // Create new tree with base_tree to preserve existing files
            console.log(`Creating tree with ${tree.length} files using base_tree...`);
            console.log('Tree entries:', JSON.stringify(tree, null, 2));
            const newTree = await this.octokit.rest.git.createTree({
                owner,
                repo,
                base_tree: currentCommit.data.commit.tree.sha,
                tree: tree as any
            });
            console.log(`Tree created: ${newTree.data.sha}`);
            console.log('Tree response:', JSON.stringify(newTree.data, null, 2));

            // Create new commit
            console.log(`Creating commit with message: ${message}`);
            const newCommit = await this.octokit.rest.git.createCommit({
                owner,
                repo,
                message,
                tree: newTree.data.sha,
                parents: [currentCommit.data.sha]
            });
            console.log(`Commit created: ${newCommit.data.sha}`);

            // Update branch reference
            console.log(`Updating branch ${branch} to point to new commit...`);
            await this.octokit.rest.git.updateRef({
                owner,
                repo,
                ref: `heads/${branch}`,
                sha: newCommit.data.sha
            });
            console.log(`Branch ${branch} updated successfully`);
        } catch (error) {
            handleError('Failed to commit files', error);
        }
    }

    private async createPullRequest(
        owner: string,
        repo: string,
        prData: CreatePRRequest
    ): Promise<GitHubPR> {
        try {
            const response = await this.octokit.rest.pulls.create({
                owner,
                repo,
                title: prData.title,
                body: prData.body,
                head: prData.head,
                base: prData.base
            });
            return response.data as GitHubPR;
        } catch (error) {
            handleError('Failed to create pull request', error);
        }
    }

    private generateDatasetSchema(input: any, views?: any): any {
        const properties: any = {};
        const required: string[] = [];

        // Validate input
        if (!input || !input.fields || !Array.isArray(input.fields)) {
            throw new Error('Invalid input: fields must be an array');
        }

        // Process each field
        input.fields.forEach((field: DatasetField) => {
            const fieldDef: any = {
                type: this.mapFieldType(field.type),
                description: field.description || `The ${field.name} field`,
                nullable: !field.required
            };

            if (field.example !== undefined) {
                fieldDef.example = field.example;
            }

            // Handle array types
            if (field.type === 'array') {
                fieldDef.items = {
                    type: 'string' // Default to string items, could be enhanced
                };
            }

            // Handle object types
            if (field.type === 'object') {
                fieldDef.properties = {};
                fieldDef.required = [];
            }

            properties[field.name] = fieldDef;

            if (field.required) {
                required.push(field.name);
            }
        });

        const datasetSchema: any = {
            actorSpecification: 1,
            fields: {
                $schema: "http://json-schema.org/draft-07/schema#",
                type: "object",
                properties,
                required,
                additionalProperties: true
            }
        };

        // Add views to the dataset schema if provided
        if (views) {
            datasetSchema.views = views;
        }

        return datasetSchema;
    }

    private generateDatasetSchemaFromJsonSchema(jsonSchema: any, views?: any): any {
        const datasetSchema: any = {
            actorSpecification: 1,
            fields: jsonSchema
        };

        // Add views to the dataset schema if provided
        if (views) {
            datasetSchema.views = views;
        }

        return datasetSchema;
    }

    private generateViewsFromFields(fields: DatasetField[]): any {
        // Validate input
        if (!fields || !Array.isArray(fields)) {
            throw new Error('Invalid input: fields must be an array');
        }

        // Generate a basic overview view with all fields
        const fieldNames = fields.map(field => field.name);
        
        const properties: any = {};
        fields.forEach(field => {
            let format = 'text';
            if (field.type === 'number') {
                format = 'number';
            } else if (field.name.toLowerCase().includes('url')) {
                format = 'link';
            } else if (field.type === 'date' || field.name.toLowerCase().includes('date')) {
                format = 'date';
            }

            properties[field.name] = {
                label: this.formatFieldLabel(field.name),
                format
            };
        });

        return {
            overview: {
                title: "Overview",
                description: "",
                transformation: {
                    fields: fieldNames
                },
                display: {
                    component: "table",
                    properties
                }
            }
        };
    }

    private mapFieldType(type: string): string {
        const typeMap: { [key: string]: string } = {
            'string': 'string',
            'number': 'number',
            'integer': 'number',
            'boolean': 'boolean',
            'object': 'object',
            'array': 'array',
            'date': 'string',
            'datetime': 'string'
        };

        return typeMap[type.toLowerCase()] || 'string';
    }

    private formatFieldLabel(fieldName: string): string {
        // Convert camelCase to Title Case
        return fieldName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    private updateActorJsonSurgically(originalContent: string): string {
        // Parse the original JSON to understand the structure
        let actorJson: any;
        try {
            actorJson = JSON.parse(originalContent);
        } catch (error) {
            throw new Error(`Invalid JSON in actor.json: ${error}`);
        }

        // Step 1: Remove views from root level if they exist
        if (actorJson.views) {
            delete actorJson.views;
        }

        // Step 2: Update storages.dataset to be a simple string reference
        if (!actorJson.storages) {
            actorJson.storages = {
                dataset: "./dataset_schema.json"
            };
        } else {
            actorJson.storages.dataset = "./dataset_schema.json";
        }

        // Return the updated JSON with the same formatting as the original
        return JSON.stringify(actorJson, null, 4);
    }
}
