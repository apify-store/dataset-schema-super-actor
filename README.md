# Dataset Schema SuperActor

A powerful orchestrator that automatically generates, enhances, validates, and creates PRs with dataset schemas for your Apify Actors. This SuperActor chains together 5 specialized Actors to provide a complete end-to-end solution.

## What Does This Actor Do?

This SuperActor automates the entire workflow of creating dataset schemas for your Actors:

1. **Generate Test Inputs** - Uses AI to create realistic test inputs for your Actor
2. **Generate Schema** - Runs your Actor with test inputs and generates an initial dataset schema
3. **Enhance Schema** - Uses AI to add descriptions, examples, and improve the schema
4. **Validate Schema** - Validates the schema against real dataset data from Redash
5. **Create PR** - Creates a GitHub pull request with the validated schema

## Quick Start

### Simple Use Case (Recommended)

The easiest way to use this Actor is to let it do everything automatically:

```json
{
  "actorTechnicalName": "apify/instagram-scraper"
}
```

That's it! The Actor will:
- Generate test inputs automatically
- Run your Actor and generate the schema
- Enhance it with AI
- Create a PR in your GitHub repository

### Using Your GitHub Repository

To create a PR in your repository, provide your GitHub credentials:

```json
{
  "actorTechnicalName": "apify/instagram-scraper",
  "githubLink": "https://github.com/your-org/your-repo",
  "githubToken": "ghp_your_github_token_here"
}
```

### Using Real Datasets

If you prefer to generate the schema from real datasets instead of test runs:

```json
{
  "actorTechnicalName": "apify/instagram-scraper",
  "useRealDatasetIds": true,
  "generateViews": true
}
```

**Note:** This requires the `REDASH_API_TOKEN` environment variable to be set in your Actor settings.

## Configuration Options

### Step-by-Step Control

You can enable/disable individual steps:

```json
{
  "actorTechnicalName": "apify/instagram-scraper",
  "generateInputs": false,
  "generateSchema": true,
  "enhanceSchema": true,
  "validateSchema": true,
  "createPR": true
}
```

### Providing Existing Schemas

Skip steps by providing existing data:

```json
{
  "actorTechnicalName": "apify/instagram-scraper",
  "generateInputs": false,
  "generateSchema": false,
  "existingEnhancedSchema": "{\"type\":\"object\",\"properties\":{...}}",
  "enhanceSchema": false,
  "validateSchema": true,
  "createPR": true
}
```

### Using Your Own Test Inputs

Provide your own test inputs instead of generating them:

```json
{
  "actorTechnicalName": "apify/instagram-scraper",
  "generateInputs": false,
  "existingMinimalInput": "{\"urls\":[\"https://example.com\"]}",
  "existingNormalInput": "{\"urls\":[...],\"maxItems\":10}",
  "existingMaximalInput": "{\"urls\":[...],\"maxItems\":100,...}",
  "existingEdgeInput": "{\"urls\":[],\"maxItems\":0}"
}
```

## Input Parameters

### Required

- **actorTechnicalName** (string) - The technical name of the Actor to generate schema for (e.g., `apify/instagram-scraper`)

### Optional - Step Control

- **generateInputs** (boolean, default: true) - Generate test inputs automatically
- **generateSchema** (boolean, default: true) - Generate initial dataset schema
- **enhanceSchema** (boolean, default: true) - Enhance schema with AI
- **validateSchema** (boolean, default: true) - Validate schema against real data
- **createPR** (boolean, default: true) - Create GitHub pull request

### Optional - Data Sources

- **useRealDatasetIds** (boolean, default: false) - Use real Redash datasets instead of test runs
- **generateViews** (boolean, default: false) - Generate dataset views in the schema

### Optional - Existing Data

- **existingMinimalInput** (string) - JSON string with minimal test input
- **existingNormalInput** (string) - JSON string with normal test input
- **existingMaximalInput** (string) - JSON string with maximal test input
- **existingEdgeInput** (string) - JSON string with edge test input
- **existingEnhancedSchema** (string) - JSON string with already enhanced schema

### Optional - GitHub (for PR creation)

- **githubLink** (string) - GitHub repository URL where PR should be created
- **githubToken** (string) - GitHub Personal Access Token with repo permissions

### Optional - Validation Settings

- **daysBack** (integer, 1-14, default: 5) - Number of days back to look for datasets
- **maximumResults** (integer, 1-100, default: 10) - Maximum results to fetch for validation
- **minimumResults** (integer, 1-100, default: 1) - Minimum results required for validation
- **runsPerUser** (integer, 1-10, default: 2) - Number of runs per user to consider
- **maxResultsPerQuery** (integer, 0-300, default: 100) - Maximum rows per Redash query

## Environment Variables

### Required

- **REDASH_API_TOKEN** - Redash API token for querying dataset data
  - Set this in your Actor's environment variables in the Apify Console
  - Go to Actor → Settings → Environment variables
  - Add `REDASH_API_TOKEN` with your Redash API key
  - Enable "Secret" to hide it in logs

## How It Works

### Step 1: Generate Test Inputs (Optional)

The Actor uses Claude Sonnet 4 to analyze your Actor and generate 4 types of test inputs:
- **Minimal** - Basic functionality test
- **Normal** - Realistic usage scenario
- **Maximal** - Comprehensive feature test
- **Edge** - Error scenarios that still produce datasets

### Step 2: Generate Schema

Two options:

**A. Using Test Inputs (Default)**
- Runs your Actor with the 4 test inputs
- Collects datasets from successful runs
- Calls a schema generator Actor to create the initial schema

**B. Using Real Datasets**
- Queries Redash for existing datasets
- Samples data from real Actor runs
- Generates schema from actual production data

### Step 3: Enhance Schema

- Uses Claude Sonnet 4 to improve the raw schema
- Adds field descriptions and examples
- Makes fields nullable
- Optionally generates dataset views
- Creates production-ready schema

### Step 4: Validate Schema

- Queries Redash for real Actor datasets
- Validates each dataset against the enhanced schema
- Reports validation success rate
- Ensures the schema matches real data

### Step 5: Create PR

- Finds the correct `actor.json` in your repository
- Creates `dataset_schema.json` with the enhanced schema
- Updates `actor.json` to reference the schema
- Creates a GitHub pull request

## Examples

### Minimum Configuration (Recommended)

```json
{
  "actorTechnicalName": "apify/my-actor"
}
```

### Using Real Datasets

```json
{
  "actorTechnicalName": "apify/my-actor",
  "useRealDatasetIds": true,
  "generateViews": true
}
```

### Skip Validation, Create PR

```json
{
  "actorTechnicalName": "apify/my-actor",
  "validateSchema": false,
  "githubLink": "https://github.com/myorg/myrepo",
  "githubToken": "ghp_xxx"
}
```

### Full Custom Configuration

```json
{
  "actorTechnicalName": "apify/my-actor",
  "generateInputs": true,
  "generateSchema": true,
  "enhanceSchema": true,
  "generateViews": true,
  "validateSchema": true,
  "daysBack": 7,
  "maximumResults": 20,
  "createPR": true,
  "githubLink": "https://github.com/myorg/myrepo",
  "githubToken": "ghp_xxx"
}
```

## Output

The Actor returns:

```json
{
  "success": true,
  "prUrl": "https://github.com/myorg/myrepo/pull/123",
  "progress": {
    "inputGeneration": "completed",
    "schemaGeneration": "completed",
    "schemaEnhancement": "completed",
    "schemaValidation": "completed",
    "prCreation": "completed"
  },
  "details": {
    "actorName": "apify/my-actor",
    "generatedSchema": {...},
    "validationResults": {...},
    "prInfo": {...}
  }
}
```

## Best Practices

1. **Start Simple** - Use the minimum configuration first, then customize
2. **Use Real Datasets** - More accurate schemas when `useRealDatasetIds: true`
3. **Generate Views** - Enable `generateViews: true` for better dataset visualization
4. **Validate Before Creating PR** - Keep `validateSchema: true` to ensure quality
5. **Set REDASH_API_TOKEN** - Essential for validation and real dataset generation

## Troubleshooting

### "REDASH_API_TOKEN environment variable is not set"

**Solution:** Add the environment variable in Apify Console:
1. Go to your Actor
2. Settings → Environment variables
3. Add `REDASH_API_TOKEN`
4. Set the Secret flag

### "Schema validation failed"

**Solution:** Check that your Actor has recent runs with datasets in Redash within the `daysBack` timeframe.

### "No datasets found"

**Solution:** 
- Increase `daysBack` to look further back
- Ensure your Actor has recent successful runs with datasets
- Check that `share_run_with_developer_enabled` is true for your Actor

## Contributing

This is an internal SuperActor for Apify's dataset schema generation workflow.

## License

Copyright © [year] Apify Technologies s.r.o. All rights reserved.

