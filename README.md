# Dataset Schema SuperActor

A powerful orchestrator that automatically generates, enhances, validates, and creates PRs with dataset schemas for your Apify Actors.

## What Does This Actor Do?

This SuperActor automates the entire workflow of creating dataset schemas for your Actors through 5 simple steps:

1. **Generate inputs** - Uses AI to create realistic test inputs
2. **Generate schema** - Runs your Actor and creates an initial dataset schema
3. **Enhance schema** - Uses AI to add descriptions, examples, and improve the schema
4. **Validate schema** - Validates against real dataset data
5. **Create PR** - Creates a GitHub pull request with the validated schema

## Quick Start

The easiest way to use this Actor - just provide your Actor's technical name:

### Basic Usage

In the Actor input form:

1. **Actor Technical Name**: `apify/instagram-scraper`
2. Leave all checkboxes enabled (default)
3. Click **Run**

That's it! The Actor will handle everything automatically.

### To Create a GitHub PR

Add your GitHub repository information:

1. **Actor Technical Name**: `apify/instagram-scraper`
2. **Step 5: Create GitHub PR** → Enable checkbox
3. **GitHub Repository Link**: `https://github.com/your-org/your-repo`
4. **GitHub Personal Access Token**: Your GitHub token
5. Click **Run**

## Step-by-Step Guide

### Step 1: Generate Inputs (Recommended)

**What it does:** Uses AI (Claude Sonnet 4) to analyze your Actor and create 4 types of test inputs:
- Minimal input - Basic functionality test
- Normal input - Realistic usage scenario  
- Maximal input - Comprehensive feature test
- Edge input - Error scenarios that still produce datasets

**How to use:**
- ✅ Keep "Generate Test Inputs" enabled (default)
- Or disable to provide your own inputs in Step 2

### Step 2: Generate Schema (Required)

**What it does:** Runs your Actor with test inputs, collects datasets, and generates an initial schema.

**Two options:**

**Option A: Using test inputs (Easiest)**
- ✅ Keep "Generate Initial Schema" enabled
- ✅ Step 1 must be enabled (or provide existing inputs below)
- The Actor will use generated/provided test inputs

**Option B: Using real datasets**
- ✅ Enable "Generate Initial Schema"
- ✅ Enable "Use Real Dataset IDs Instead"
- Uses actual production data from Redash
- More accurate but requires `REDASH_API_TOKEN` environment variable

### Step 3: Schema Enhancement (Recommended)

**What it does:** Uses AI to improve the raw schema by adding descriptions, examples, and making it production-ready.

**How to use:**
- ✅ Keep "Enhance Schema with AI" enabled (default)
- Or provide "Existing Enhanced Schema" to skip this step
- ✅ Enable "Generate Views" to add dataset views

### Step 4: Schema Validation (Recommended)

**What it does:** Queries Redash for real Actor datasets and validates the schema against actual data to ensure accuracy.

**How to use:**
- ✅ Keep "Validate Schema" enabled (default)
- Adjust validation parameters if needed:
  - **Days Back** (1-14, default: 5) - How far back to look
  - **Maximum Results** (1-100, default: 10) - Max datasets to fetch
  - **Minimum Results** (1-100, default: 1) - Min datasets required
  - **Runs Per User** (1-10, default: 2) - Runs to consider
  - **Max Results Per Query** (0-300, default: 100) - Query limit

**Note:** Requires `REDASH_API_TOKEN` environment variable

### Step 5: GitHub PR Creation

**What it does:** Creates a GitHub pull request with the validated schema and updated actor.json.

**How to use:**
- ✅ Enable "Create GitHub PR"
- **GitHub Repository Link**: Your repo URL
- **GitHub Personal Access Token**: Your GitHub token
- Click **Run**

The PR will include:
- `dataset_schema.json` - The validated schema
- Updated `actor.json` - References to the schema

## Environment Variables

### Required Setup

**REDASH_API_TOKEN** - Your Redash API token

Set this up:
1. Open your Actor in Apify Console
2. Go to **Settings** → **Environment variables**
3. Add new variable:
   - Name: `REDASH_API_TOKEN`
   - Value: Your Redash API token
   - ✅ Enable "Secret" (hides it in logs)
4. Click **Save**

**When you need it:**
- Step 2 with "Use Real Dataset IDs Instead" enabled
- Step 4 "Validate Schema" enabled

## Common Use Cases

### Use Case 1: Quick Schema Generation (Easiest)

Just need a schema quickly:

1. **Actor Technical Name**: `your-actor/name`
2. All steps enabled ✅
3. Click **Run**

### Use Case 2: Using Real Production Data

Generate schema from actual Actor runs:

1. **Actor Technical Name**: `your-actor/name`
2. **Step 2** → ✅ Enable "Generate Initial Schema"
3. **Step 2** → ✅ Enable "Use Real Dataset IDs Instead"
4. **Step 3** → ✅ Enable "Generate Views"
5. All other steps enabled ✅
6. Click **Run**

### Use Case 3: Skip Validation

Skip validation step if you want faster results:

1. **Actor Technical Name**: `your-actor/name`
2. All steps enabled ✅
3. **Step 4** → ❌ Disable "Validate Schema"
4. Click **Run**

### Use Case 4: Create PR in Your Repository

Generate schema and create a pull request:

1. **Actor Technical Name**: `your-actor/name`
2. All steps enabled ✅
3. **Step 5** → **GitHub Repository Link**: `https://github.com/yourorg/repo`
4. **Step 5** → **GitHub Personal Access Token**: `ghp_xxx`
5. Click **Run**

### Use Case 5: Provide Your Own Inputs

Use custom test inputs:

1. **Actor Technical Name**: `your-actor/name`
2. **Step 1** → ❌ Disable "Generate Test Inputs"
3. **Step 2** → ✅ Enable "Generate Initial Schema"
4. **Step 2** → Provide your inputs:
   - **Existing Minimal Input**: `{"urls":["https://example.com"]}`
   - **Existing Normal Input**: `{"urls":[...],"maxItems":10}`
   - **Existing Maximal Input**: `{"urls":[...],"maxItems":100}`
   - **Existing Edge Input**: `{"urls":[],"maxItems":0}`
5. Click **Run**

## Understanding the Steps

### Why 5 Steps?

Each step can work independently:

- **Step 1** - AI creates test inputs, or you provide them
- **Step 2** - Generates schema from test runs or real datasets
- **Step 3** - Enhances the schema with AI improvements
- **Step 4** - Validates the schema against real data
- **Step 5** - Creates a GitHub PR with the results

You can enable/disable any step. Disabled steps are skipped.

### Schema Generation Options

**Test Inputs (Step 1 + Step 2):**
- ✅ Pros: Works immediately, no real data needed
- ❌ Cons: Schema might not match all real data patterns

**Real Datasets (Step 2 with "Use Real Dataset IDs"):**
- ✅ Pros: More accurate, based on real production data
- ❌ Cons: Requires Actor to have recent runs with datasets

**Recommendation:** Start with test inputs, then validate (Step 4) to check accuracy.

## Best Practices

1. **Always enable Step 3** - Enhances schema with AI
2. **Enable Step 4** - Validates schema matches real data
3. **Enable "Generate Views"** - Better dataset visualization
4. **Use "Use Real Dataset IDs"** - More accurate schemas
5. **Set REDASH_API_TOKEN** - Required for validation

## Troubleshooting

### "REDASH_API_TOKEN environment variable is not set"

**Solution:** Add it in Apify Console:
1. Actor → Settings → Environment variables
2. Add `REDASH_API_TOKEN`
3. Set your Redash token
4. Enable "Secret"

### "Schema validation failed"

**Fix:** Check your Actor has recent runs with datasets within the days back timeframe.

### "No datasets found"

**Fix:** Increase "Days Back" or ensure your Actor has recent successful runs.

## Output

Returns a summary with:

```json
{
  "success": true,
  "prUrl": "https://github.com/...",
  "progress": {
    "inputGeneration": "completed",
    "schemaGeneration": "completed",
    "schemaEnhancement": "completed",
    "schemaValidation": "completed",
    "prCreation": "completed"
  }
}
```

## Tips

- **Start simple** - Enable all steps, use defaults
- **Adjust validation** - Tune Step 4 parameters for your needs
- **Use real data** - Enable "Use Real Dataset IDs" for accuracy
- **Enable views** - Better dataset visualization in Apify Console
