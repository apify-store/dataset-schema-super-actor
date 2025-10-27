# Dataset Schema SuperActor

An automated Apify Actor that streamlines the creation of dataset schemas for Apify Actors. This SuperActor takes you through a complete workflow from input generation to GitHub pull request creation.

## Overview

The Dataset Schema SuperActor generates, enhances, validates, and deploys dataset schemas for Apify Actors. It automates the entire lifecycle of dataset schema creation, ensuring consistency and quality across your Actor projects.

## Five Core Steps

The Actor operates in five sequential steps, each of which can be enabled or skipped based on your needs:

### 📝 Step 1: Generate Test Inputs

This step uses Claude Sonnet 4 to generate four types of test inputs for your Actor:
- **Minimal Input:** Basic input with only essential parameters
- **Normal Input:** Realistic input with common optional parameters
- **Maximal Input:** Comprehensive input utilizing all available parameters
- **Edge Input:** Input designed to test error handling while still producing a dataset

The generated inputs are validated against the Actor to ensure they work correctly before proceeding.

**When to use:**
- You don't have existing test inputs
- You want to generate comprehensive test coverage automatically
- You're testing a new Actor

---

### 📊 Step 2: Generate Initial Schema

This step creates a base dataset schema. You have **three independent options**:

#### Option A: Generate Inputs First (Step 1)
- Enable Step 1 to auto-generate test inputs
- The Actor runs with these generated inputs
- Schema is extracted from the output datasets

#### Option B: Provide Your Own Inputs
- Set `generateInputs: false`
- Provide `existingMinimalInput`, `existingNormalInput`, `existingMaximalInput`, `existingEdgeInput`
- The Actor runs with your provided inputs
- Schema is extracted from the output datasets

#### Option C: Use Real Production Datasets
- Set `generateInputs: false` and `useRealDatasetIds: true`
- The Actor queries Redash to find recent datasets for your Actor
- Samples data from real production runs
- Schema is generated from actual user data (no Actor runs needed)

The schema generator Actor analyzes the structure of items in the datasets and creates a JSON Schema definition.

**When to use:**
- Option A: You want everything automated
- Option B: You have proven test inputs that work
- Option C: You want the most realistic schema based on actual usage patterns

---

### ✨ Step 3: Schema Enhancement

This step uses Claude Sonnet 4 to improve the initial schema by:
- Adding clear field descriptions
- Generating realistic, anonymized examples
- Ensuring proper field types and formats
- Creating dataset views (if enabled)
- Making all fields nullable by default

**Important:** All fields start as nullable. After the Actor generates the enhanced schema, developers can review it and choose which fields should:
- Not be nullable (required for schema validation)
- Be added to the `required` array
- Have stricter type constraints

The enhancer works with the existing schema structure and only improves the content—it doesn't add, remove, or rename fields.

**When to use:**
- You want a production-ready schema with documentation
- You need dataset views for better visualization
- You want to improve existing schema quality

---

### 🔍 Step 4: Schema Validation

This step queries Redash to find datasets from recent Actor runs and validates them against the schema:
- Fetches datasets from the last N days (configurable)
- Samples data from each dataset
- Validates data structure against the schema
- Reports validation success rate and any errors

Validation ensures the schema accurately represents real Actor output data. It requires a 100% success rate before proceeding to PR creation.

**When to use:**
- You want to verify schema accuracy against real data
- You need to catch schema issues before deploying
- You want confidence that the schema works with production data

---

### 📝 Step 5: GitHub PR Creation

This step automates the GitHub workflow:
1. Finds the target Actor's repository (supports monorepo structures)
2. Locates the correct `actor.json` file in the actor's directory
3. Creates a new branch
4. Generates `dataset_schema.json` with field definitions and views
5. Moves existing views from `actor.json` to `dataset_schema.json` (if they exist)
6. Updates `actor.json` to reference the schema
7. Creates a pull request

**When to use:**
- You want to deploy the schema to your Actor repository
- You need an automated PR workflow
- You're ready to integrate the schema into your codebase

**GitHub Token Permissions Needed:**
- `repo` - Full control of private repositories
- `workflow` - Update GitHub Action workflows (if applicable)

---

## Usage Examples

### Full Workflow
Generate everything automatically from scratch:

```json
{
  "actorTechnicalName": "compass/Instagram-Scraper",
  "generateInputs": true,
  "generateSchema": true,
  "enhanceSchema": true,
  "generateViews": true,
  "validateSchema": true,
  "createPR": true,
  "githubLink": "https://github.com/apify/actors",
  "githubToken": "ghp_your_token_here"
}
```

### Using Your Own Inputs
Skip input generation and use your own test inputs:

```json
{
  "actorTechnicalName": "compass/Instagram-Scraper",
  "generateInputs": false,
  "generateSchema": true,
  "existingMinimalInput": "{\"directUrls\": [\"https://instagram.com/user\"], \"maxItems\": 3}",
  "existingNormalInput": "{\"directUrls\": [...], \"maxItems\": 50}",
  "existingMaximalInput": "{\"directUrls\": [...], \"maxItems\": 500, \"extendOutputFunction\": \"...\"}",
  "existingEdgeInput": "{\"directUrls\": [\"https://instagram.com/nonexistent_user_999\"], \"maxItems\": 1}",
  "enhanceSchema": true,
  "validateSchema": true,
  "createPR": true,
  "githubLink": "https://github.com/apify/actors",
  "githubToken": "ghp_your_token_here"
}
```

### Using Real Production Datasets
Generate schema from production data instead of test inputs:

```json
{
  "actorTechnicalName": "compass/Instagram-Scraper",
  "generateInputs": false,
  "generateSchema": true,
  "useRealDatasetIds": true,
  "enhanceSchema": true,
  "validateSchema": true,
  "daysBack": 7,
  "maximumResults": 20,
  "createPR": true,
  "githubLink": "https://github.com/apify/actors",
  "githubToken": "ghp_your_token_here"
}
```

### Schema Enhancement Only
Enhance an existing schema without running any Actors:

```json
{
  "actorTechnicalName": "compass/Instagram-Scraper",
  "generateInputs": false,
  "generateSchema": false,
  "enhanceSchema": true,
  "existingEnhancedSchema": "{\"actorSpecification\": 1, \"fields\": {...}}",
  "validateSchema": false,
  "createPR": true,
  "githubLink": "https://github.com/apify/actors",
  "githubToken": "ghp_your_token_here"
}
```

### Skip PR Creation
Generate and validate schema without creating a PR:

```json
{
  "actorTechnicalName": "compass/Instagram-Scraper",
  "generateInputs": true,
  "generateSchema": true,
  "enhanceSchema": true,
  "validateSchema": true,
  "createPR": false
}
```

---

## Workflow Output

The Actor provides detailed progress information for each step:

```json
{
  "success": true,
  "prUrl": "https://github.com/org/repo/pull/123",
  "progress": {
    "inputGeneration": "completed",
    "schemaGeneration": "completed",
    "schemaEnhancement": "completed",
    "schemaValidation": "completed",
    "prCreation": "completed"
  },
  "details": {
    "actorName": "compass/Instagram-Scraper",
    "generatedSchema": {...},
    "validationResults": {...},
    "prInfo": {...}
  }
}
```

---

## Best Practices

### Input Generation
- Ensure the Actor is accessible and working before running
- Use realistic URLs and parameters that actually exist
- Keep URL arrays short (2-5 items) to avoid timeout issues

### Schema Generation
- Start with minimal inputs to reduce costs and time
- Use `maxItems: 3` to limit dataset size during testing
- Consider using `useRealDatasetIds` for more accurate schemas from production data

### Schema Enhancement
- Enable `generateViews: true` for better data visualization in Apify Console
- Review AI-generated descriptions for accuracy before creating PRs
- After generation, manually set which fields should be required (not nullable)

### Schema Validation
- Set `daysBack` to 7-14 for better dataset coverage
- Increase `maximumResults` for more comprehensive validation
- Ensure 100% validation success rate before creating PRs

### PR Creation
- Use GitHub secrets for tokens in production
- Verify repository structure before running
- Review the PR diff carefully before merging
- Check that existing views were properly moved to `dataset_schema.json`

---

## Error Handling

The Actor provides detailed error messages for each step:

- **Input Generation Failed:** Generated inputs don't work with the Actor
  - Solution: Check Actor requirements, provide better inputs manually, or review Actor's input schema
  
- **Schema Generation Failed:** No datasets found or schema generator failed
  - Solution: Verify Actor runs successfully, check dataset accessibility, try with `useRealDatasetIds: true`
  
- **Schema Enhancement Failed:** AI enhancement returned invalid schema
  - Solution: Review schema size limits, provide existing enhanced schema, check network connectivity
  
- **Validation Failed:** Schema doesn't match real data (must be 100% success rate)
  - Solution: Review validation errors, adjust schema manually, check for missing optional fields
  
- **PR Creation Failed:** GitHub API errors or repository not found
  - Solution: Verify GitHub token has correct permissions, check repository URL format, ensure Actor exists in monorepo

---

## Technical Details

### Schema Format
The Actor generates schemas following the Apify Actor specification format:

```json
{
  "actorSpecification": 1,
  "fields": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
      "fieldName": {
        "type": "string",
        "description": "Field description",
        "nullable": true,
        "example": "example_value"
      }
    },
    "required": []
  },
  "views": {
    "overview": {
      "title": "Overview",
      "transformation": { "fields": ["field1", "field2"] }
    }
  }
}
```

### Dataset Views
Views are generated automatically when `generateViews: true`:
- Overview view with all fields in table format
- Field formatting based on type (image, link, date, number)
- Proper field labels from camelCase
- Existing views are moved from `actor.json` to `dataset_schema.json`

### GitHub Integration
The Actor:
1. Searches for Actor-specific `actor.json` files in monorepo structures
2. Supports path patterns like `actors/[actor-name]/.actor/actor.json`
3. Moves existing views from `actor.json` to the new `dataset_schema.json`
4. Updates `actor.json` to reference `dataset_schema.json` via the `storages.dataset` field
5. Preserves existing formatting and structure

---

## Support

For issues, questions, or contributions:
- Check the Actor logs for detailed error messages
- Review each step's output in the progress tracking
- Open an issue (or better yet a PR) in the repository
