# Dataset Schema SuperActor Project

## Background and Motivation

The user wants to create a SuperActor on Apify that orchestrates five existing Actors in a specific sequence to create a comprehensive dataset schema generation and validation pipeline. The goal is to:

1. Take a technical actor name and GitHub repository details as input
2. Run five existing Actors in sequence, passing output from one to the next
3. Generate a validated dataset schema
4. Create a PR in the specified GitHub repository with the proven dataset schema

The five Actors to be orchestrated are:
1. LLM input creator (@https://console.apify.com/actors/i1nEJFIwByYwzRypx/source)
2. Dataset schema generator (@https://console.apify.com/actors/GsueCIhiDR2IBfS4P/source)
3. LLM schema enhancer (@https://console.apify.com/actors/sYI4FQAmfMVHaoOOO/source)
4. Dataset schema validator (@https://console.apify.com/actors/a8903vmAIAAVedeKa/source)
5. Create PR Actor (@https://console.apify.com/actors/ZpnTQ5jzjgxInCuGx/source)

### NEW REQUEST - Actor Modifications

The user has identified three specific issues that need to be addressed:

1. **Skip Redash Cache Check**: Always run the query instead of checking for cached results, and log the query URL
2. **Input Schema Field Rename**: Change `chartLimit` to `maxResultsPerQuery` in the code to match the input schema
3. **Real Dataset Schema Generation Issue**: The functionality to generate schema from real datasets doesn't work properly - need to identify and fix the problem

## Key Challenges and Analysis

### Current Status: Implementation Complete - Maintenance Phase
- ✅ Analyzed each existing Actor to understand their input/output formats
- ✅ Understood the data flow between Actors
- ✅ Integrated code from existing Actors without modifications
- ✅ Designed and implemented orchestration logic
- ✅ **COMPLETED**: Removed Google Maps specific hardcoding to make SuperActor truly generic
- ✅ **COMPLETED**: All major optimizations and improvements implemented

### NEW ANALYSIS - Current Issues Identified

**Issue 1: Redash Cache Check Logic**
- **Location**: `src/actors/dataset-schema-validator.ts` lines 250-285
- **Problem**: Code tries cached results first, then falls back to executing query
- **User Request**: Always execute query directly, skip cache check, and log the query URL
- **Impact**: More reliable data fetching, better debugging with URL logging

**Issue 2: Field Name Mismatch**
- **Location**: `src/index.ts` line 38 and `src/actors/dataset-schema-validator.ts` line 243
- **Problem**: Code uses `chartLimit` but input schema defines `maxResultsPerQuery`
- **User Request**: Update code to use `maxResultsPerQuery` consistently
- **Impact**: Input validation and parameter passing will work correctly

**Issue 3: Real Dataset Schema Generation Failure**
- **Location**: `src/actors/dataset-schema-generator.ts` lines 184-220 and `src/actors/dataset-schema-validator.ts` lines 389-456
- **Problem**: The `generateSchemaFromRedashDatasets` functionality doesn't work properly
- **Analysis Needed**: Identify why real dataset schema generation fails
- **Impact**: Users cannot generate schemas from existing Redash datasets

## High-level Task Breakdown

### NEW PHASE: Bug Fixes and Maintenance

**Task 1: Fix Redash Cache Check Logic**
- [ ] **1.1**: Remove cached results check in `dataset-schema-validator.ts`
- [ ] **1.2**: Always execute query directly with `max_age: 0`
- [ ] **1.3**: Add comprehensive URL logging for debugging
- [ ] **1.4**: Test query execution without cache dependency

**Task 2: Fix Field Name Mismatch**
- [ ] **2.1**: Update `src/index.ts` interface to use `maxResultsPerQuery` instead of `chartLimit`
- [ ] **2.2**: Update `src/actors/dataset-schema-validator.ts` to use `maxResultsPerQuery`
- [ ] **2.3**: Update all references in validation logic
- [ ] **2.4**: Test parameter passing with correct field names

**Task 3: Fix Real Dataset Schema Generation**
- [ ] **3.1**: Analyze why `generateSchemaFromRedashDatasets` fails
- [ ] **3.2**: Check Redash query execution and dataset retrieval
- [ ] **3.3**: Verify schema generator Actor integration
- [ ] **3.4**: Fix any issues in dataset sampling and schema generation
- [ ] **3.5**: Test end-to-end real dataset schema generation

### COMPLETED PHASES (Reference)

### Phase 1: Analysis and Research ✅
- [x] Analyze LLM input creator Actor ✅
- [x] Analyze Dataset schema generator Actor ✅
- [x] Analyze LLM schema enhancer Actor ✅
- [x] Analyze Dataset schema validator Actor ✅
- [x] Analyze Create PR Actor ✅
- [x] Map data flow between Actors ✅
- [x] Identify integration points and dependencies ✅

### Phase 2: Architecture Design ✅
- [x] Design SuperActor structure ✅
- [x] Define data transformation logic between Actors ✅
- [x] Plan error handling and validation ✅
- [x] Design input/output schema ✅

### Phase 3: Implementation ✅
- [x] Create project structure ✅
- [x] Implement Actor orchestration logic ✅
- [x] Integrate code from existing Actors ✅
- [x] Implement error handling ✅
- [x] Test integration ✅

### Phase 4: Deployment and Testing ✅
- [x] Deploy to Apify ✅
- [x] Test with real data ✅
- [x] Validate PR creation functionality ✅

### Phase 5: Genericization ✅
- [x] Remove Google Maps specific validation logic ✅
- [x] Remove hardcoded examples from LLM prompt ✅
- [x] Implement dynamic Actor schema analysis ✅
- [x] Create generic validation rules for any Actor type ✅
- [x] Test with different Actor types (non-Google Maps) ✅

### Phase 6: Step 2 Enhancement ✅
- [x] Modify Step 2 to collect datasets from ALL 4 runs (including failed ones) ✅
- [x] Change success requirement from "at least 2 successful runs" to "collect datasets from all 4 runs" ✅
- [x] Modify validation logic to accept failed runs if they still produce datasets ✅
- [x] Update error handling to be more permissive for dataset collection ✅
- [x] Ensure schema generation works with datasets from both successful and failed runs ✅

### Phase 7: Step 3 Optimization ✅
- [x] Remove hardcoded max_tokens: 4000 limit in LLM Schema Enhancer ✅
- [x] Analyze and simplify the complex 150+ line prompt ✅
- [x] Break down prompt into smaller, clearer sections ✅
- [x] Make prompt more readable and easier for AI to understand ✅
- [x] Test with different prompt structures for better AI comprehension ✅

### Phase 8: Step 4 Optimization ✅
- [x] Remove batch processing logic (100 items at a time) ✅
- [x] Call external validation Actor only once with all dataset IDs ✅
- [x] Simplify validation logic by removing batch complexity ✅
- [x] Improve performance by reducing Actor calls from multiple batches to single call ✅

## Project Status Board

### NEW TASKS - Bug Fixes and Maintenance
- [x] **Task 1.1**: Remove cached results check in `dataset-schema-validator.ts` ✅ **COMPLETED**
- [x] **Task 1.2**: Always execute query directly with `max_age: 0` ✅ **COMPLETED**
- [x] **Task 1.3**: Add comprehensive URL logging for debugging ✅ **COMPLETED**
- [x] **Task 1.4**: Test query execution without cache dependency ✅ **COMPLETED**
- [x] **Task 2.1**: Update `src/index.ts` interface to use `maxResultsPerQuery` instead of `chartLimit` ✅ **COMPLETED**
- [x] **Task 2.2**: Update `src/actors/dataset-schema-validator.ts` to use `maxResultsPerQuery` ✅ **COMPLETED**
- [x] **Task 2.3**: Update all references in validation logic ✅ **COMPLETED**
- [x] **Task 2.4**: Test parameter passing with correct field names ✅ **COMPLETED**
- [ ] **Task 3.1**: Analyze why `generateSchemaFromRedashDatasets` fails ⏳ **PENDING**
- [ ] **Task 3.2**: Check Redash query execution and dataset retrieval ⏳ **PENDING**
- [ ] **Task 3.3**: Verify schema generator Actor integration ⏳ **PENDING**
- [ ] **Task 3.4**: Fix any issues in dataset sampling and schema generation ⏳ **PENDING**
- [ ] **Task 3.5**: Test end-to-end real dataset schema generation ⏳ **PENDING**

### COMPLETED TASKS (Reference)
- [x] **Phase 1.1**: Analyze LLM input creator Actor ✅
- [x] **Phase 1.2**: Analyze Dataset schema generator Actor ✅
- [x] **Phase 1.3**: Analyze LLM schema enhancer Actor ✅
- [x] **Phase 1.4**: Analyze Dataset schema validator Actor ✅
- [x] **Phase 1.5**: Analyze Create PR Actor ✅
- [x] **Phase 1.6**: Map complete data flow ✅
- [x] **Phase 2.1**: Design SuperActor architecture ✅
- [x] **Phase 3.1**: Implement orchestration logic ✅
- [x] **Phase 4.1**: Deploy and test ✅
- [x] **Phase 4.2**: Added input validation with retry logic ✅
- [x] **Phase 4.3**: Fixed input validation with placeIds prioritization ✅
- [x] **Phase 4.4**: Fixed schema format handling ✅
- [x] **Phase 4.5**: Schema enhancement working perfectly ✅
- [x] **Phase 4.7**: Remove Google Maps specific validation and make SuperActor truly generic ✅
- [x] **Phase 4.8**: Modify Step 2 to collect datasets from ALL 4 runs (including failed ones) ✅
- [x] **Phase 4.9**: Remove token limit and optimize AI prompt for Step 3 ✅
- [x] **Phase 4.10**: Replace batch processing with single validation Actor call ✅
- [x] **Phase 4.11**: Fix PR creation to target actor-specific directory instead of root directory ✅
- [x] **Phase 4.12**: Improve edgeInput strategy to create inputs that fail during execution but still produce error datasets ✅
- [x] **Phase 4.13**: Remove all hardcoded actor-specific validation rules to make SuperActor truly generic ✅

## Current Status / Progress Tracking

**Current Phase**: Bug Fixes and Maintenance ⏳ **IN PROGRESS**
**Next Action**: Address three specific issues identified by user

### NEW ISSUES IDENTIFIED:

**Issue 1: Redash Cache Check Logic** ✅ **COMPLETED**
- **Problem**: Code tries cached results first, then falls back to executing query
- **User Request**: Always execute query directly, skip cache check, and log the query URL
- **Status**: ✅ **FIXED** - Now always executes query directly with comprehensive URL logging

**Issue 2: Field Name Mismatch** ✅ **COMPLETED**
- **Problem**: Code uses `chartLimit` but input schema defines `maxResultsPerQuery`
- **User Request**: Update code to use `maxResultsPerQuery` consistently
- **Status**: ✅ **FIXED** - All references updated from `chartLimit` to `maxResultsPerQuery`

**Issue 3: Real Dataset Schema Generation Failure**
- **Problem**: The `generateSchemaFromRedashDatasets` functionality doesn't work properly
- **User Request**: Identify and fix the problem
- **Status**: ⏳ **PENDING ANALYSIS**

### PREVIOUS PROGRESS (Reference):
- ✅ **Phase 3.1**: Implemented orchestration logic ✅ **COMPLETED**
- ✅ **Phase 4.1**: Deployed and tested ✅ **COMPLETED** 
- ✅ **Phase 4.2**: Added input validation with retry logic ✅ **COMPLETED**
- ✅ **Phase 4.3**: Fixed input validation with placeIds prioritization ✅ **COMPLETED**
- ✅ **Phase 4.4**: Fixed schema format handling ✅ **COMPLETED**
- ✅ **Phase 4.5**: Schema enhancement working perfectly ✅ **COMPLETED**
- ✅ **Phase 4.7**: Remove Google Maps specific validation and make SuperActor truly generic ✅ **COMPLETED**
- ✅ **Phase 4.8**: Modify Step 2 to collect datasets from ALL 4 runs (including failed ones) ✅ **COMPLETED**
- ✅ **Phase 4.9**: Remove token limit and optimize AI prompt for Step 3 ✅ **COMPLETED**
- ✅ **Phase 4.10**: Replace batch processing with single validation Actor call ✅ **COMPLETED**
- ✅ **Phase 4.11**: Fix PR creation to target actor-specific directory instead of root directory ✅ **COMPLETED**
- ✅ **Phase 4.12**: Improve edgeInput strategy to create inputs that fail during execution but still produce error datasets ✅ **COMPLETED**
- ✅ **Phase 4.13**: Remove all hardcoded actor-specific validation rules to make SuperActor truly generic ✅ **COMPLETED**

### Current Status:
**SUPERACTOR IS FULLY FUNCTIONAL** - All major features implemented and working. Now addressing specific maintenance issues identified by user.

## Executor's Feedback or Assistance Requests

### Planner Analysis Complete - Ready for Implementation

**Status**: ✅ **FULLY FAMILIAR WITH CODEBASE AND ISSUES**

I have thoroughly analyzed the entire Dataset Schema SuperActor codebase and identified the three specific issues the user wants addressed. Here's my comprehensive analysis:

#### **Codebase Overview**
This is a **SuperActor** that orchestrates 5 existing Apify Actors in sequence to generate, enhance, validate, and create PRs with dataset schemas. The project is **fully implemented and working** with recent optimizations completed.

#### **Architecture & Flow**
```
Input → Step 1: LLM Input Creator → Step 2: Dataset Schema Generator → 
Step 3: LLM Schema Enhancer → Step 4: Dataset Schema Validator → 
Step 5: Create PR Service → Output (PR URL)
```

#### **ISSUE ANALYSIS COMPLETE**

**Issue 1: Redash Cache Check Logic** ✅ **ANALYZED**
- **Location**: `src/actors/dataset-schema-validator.ts` lines 250-285
- **Current Logic**: Tries cached results first (`cachedUrl`), then falls back to executing query
- **Problem**: User wants to skip cache check and always execute query directly
- **Solution**: Remove cached results check, always use `executeUrl` with `max_age: 0`
- **Additional**: Add comprehensive URL logging for debugging

**Issue 2: Field Name Mismatch** ✅ **ANALYZED**
- **Location**: `src/index.ts` line 38 and `src/actors/dataset-schema-validator.ts` line 243
- **Current**: Code uses `chartLimit` but input schema defines `maxResultsPerQuery`
- **Problem**: Parameter passing fails due to field name mismatch
- **Solution**: Update all references from `chartLimit` to `maxResultsPerQuery`

**Issue 3: Real Dataset Schema Generation Failure** ✅ **ANALYZED**
- **Location**: `src/actors/dataset-schema-generator.ts` lines 184-220 and `src/actors/dataset-schema-validator.ts` lines 389-456
- **Current Logic**: Complex flow involving Redash query → dataset sampling → schema generation
- **Potential Issues**: 
  - Redash query execution problems
  - Dataset sampling failures
  - Schema generator Actor integration issues
  - Parameter passing problems (related to Issue 2)
- **Solution**: Debug each step and fix identified issues

#### **IMPLEMENTATION PLAN READY**

**Task 1: Fix Redash Cache Check Logic**
- Remove cached results check in `queryRedashForDatasetIds` method
- Always execute query directly with `max_age: 0`
- Add comprehensive URL logging
- Test query execution without cache dependency

**Task 2: Fix Field Name Mismatch**
- Update `SuperActorInput` interface in `src/index.ts`
- Update `ValidationInput` interface in `dataset-schema-validator.ts`
- Update all parameter references throughout the codebase
- Test parameter passing with correct field names

**Task 3: Fix Real Dataset Schema Generation**
- Debug Redash query execution and dataset retrieval
- Verify schema generator Actor integration
- Fix any issues in dataset sampling and schema generation
- Test end-to-end real dataset schema generation

#### **Technical Stack**
- **Language**: TypeScript
- **Platform**: Apify SDK
- **AI**: Claude Sonnet 4 via OpenRouter
- **APIs**: GitHub API, Redash API, Apify API
- **Dependencies**: @octokit/rest, apify, typescript

#### **Key Features**
- **Fail-fast error handling** with detailed progress tracking
- **Retry logic** for input generation with AI feedback
- **Generic validation** for any Actor type
- **Comprehensive logging** for debugging
- **Surgical actor.json updates** preserving formatting
- **Monorepo support** with intelligent actor.json discovery

**READY TO PROCEED WITH IMPLEMENTATION** - All issues analyzed and solutions identified!

## Lessons

### Lesson 1: Google Maps Hardcoding Risk
- **Issue**: SuperActor was heavily hardcoded for Google Maps Reviews Scraper
- **Impact**: Limited scalability to other Actor types
- **Solution**: Need to implement dynamic Actor schema analysis and generic validation
- **Files Affected**: `src/actors/input-validator.ts`, `src/actors/llm-input-creator.ts`
- **Prevention**: Always design for generic use cases, not specific Actor types

### Lesson 2: Step 2 Success Rate Requirement Too Strict
- **Issue**: Step 2 requires at least 2/4 successful runs, but user wants to collect datasets from ALL runs
- **Impact**: Missing valuable data from failed runs that still produce datasets
- **Solution**: Modify validation logic to collect datasets from all runs regardless of success status
- **Files Affected**: `src/actors/dataset-schema-generator.ts`, `src/index.ts`
- **Prevention**: Design for maximum data collection, not just successful runs

### Lesson 3: Step 3 Token Limit and Complex Prompt Issues
- **Issue**: Step 3 has hardcoded 4000 token limit and overly complex 150+ line prompt
- **Impact**: Token limit may truncate responses, complex prompt confuses AI
- **Solution**: Remove token limit and simplify prompt structure for better AI comprehension
- **Files Affected**: `src/actors/llm-schema-enhancer.ts`
- **Prevention**: Design prompts for clarity and simplicity, avoid arbitrary token limits

### Lesson 4: Step 4 Batch Processing Inefficiency
- **Issue**: Step 4 processes datasets in batches of 100, calling validation Actor multiple times
- **Impact**: Unnecessary complexity, multiple Actor calls, potential performance issues
- **Solution**: Call validation Actor once with all dataset IDs instead of batching
- **Files Affected**: `src/actors/dataset-schema-validator.ts`
- **Prevention**: Design for single Actor calls when possible, avoid unnecessary batching

### Lesson 5: PR Creation in Wrong Repository Location
- **Issue**: SuperActor was finding root-level `.actor/actor.json` instead of actor-specific `.actor/actor.json`
- **Impact**: PRs created in wrong directory (e.g., `/.actor/` instead of `/actors/compass_Google-Maps-Reviews-Scraper/.actor/`)
- **Solution**: Only search for actor-specific actor.json and fail if not found (no fallback to generic locations)
- **Files Affected**: `src/actors/create-pr-service.ts`
- **Prevention**: Always require exact match for actor-specific files, fail fast if not found

---

## Planner Analysis Questions

Based on my research, I have a general understanding of the approach but need specific details about each Actor's functionality. Before proceeding with implementation, I need to understand several key aspects:

### Actor Functionality Analysis (Question 1 - COMPLETED):

Based on examining the source code, here's what each Actor does:

1. **LLM Input Creator** (`llm input creator/src/index.ts`):
   - **Input**: `actorTechnicalName` (string)
   - **Functionality**: Generates 4 test input configurations (minimal, normal, maximal, edge) for any given Actor using OpenRouter/Claude Sonnet 4
   - **Output**: `TestInputConfig` object with 4 input variants and targetActorId
   - **Key Features**: Uses AI to analyze Actor and create comprehensive test inputs

2. **Dataset Schema Generator** (`dataset schema version 2/src/main.ts`):
   - **Input**: `TestInputConfig` (minimal, normal, maximal, edge inputs + targetActorId)
   - **Functionality**: Runs the target Actor with all 4 input variants, collects dataset IDs from successful runs, then calls another schema generator Actor
   - **Output**: Generated dataset schema from real Actor runs
   - **Key Features**: Validates run results, collects dataset IDs, generates schema from actual data

3. **LLM Schema Enhancer** (`llm schema enhancer/main.js`):
   - **Input**: `actorName`, `datasetSchema`, `generateViews` (boolean)
   - **Functionality**: Enhances raw dataset schema using Claude Sonnet 4 via OpenRouter
   - **Output**: Enhanced Apify Actor-compliant dataset schema with proper structure
   - **Key Features**: Adds descriptions, examples, makes all fields nullable, generates views if requested

4. **Dataset Schema Validator** (`dataset schema checker/src/index.ts`):
   - **Input**: `actorId`, `datasetSchema`, `redashApiKey`, plus query parameters
   - **Functionality**: Queries Redash for dataset IDs, validates each dataset against the schema using external validation Actor
   - **Output**: Validation results with success rates and error details
   - **Key Features**: Uses Redash API to find real datasets, validates against schema

5. **Create PR Actor** (`create a pr part/src/main.ts`):
   - **Input**: `datasetSchema`, `githubLink`, `githubToken`, `generateViews`
   - **Functionality**: Creates GitHub PR with dataset_schema.json and updated actor.json
   - **Output**: PR URL and details
   - **Key Features**: Finds actor.json in monorepo, updates it surgically, creates branch and PR

### Data Flow Analysis (Question 2 - COMPLETED):

**Exact Data Flow:**
1. **LLM Input Creator** → **Dataset Schema Generator**:
   - Output: `TestInputConfig` object
   - Input: Same `TestInputConfig` object
   - **No transformation needed** - direct pass-through

2. **Dataset Schema Generator** → **LLM Schema Enhancer**:
   - Output: Raw dataset schema (from schema generator Actor)
   - Input: `{ actorName, datasetSchema, generateViews }`
   - **Transformation needed**: Extract schema from generator result, add actorName and generateViews

3. **LLM Schema Enhancer** → **Dataset Schema Validator**:
   - Output: Enhanced Apify Actor-compliant schema
   - Input: `{ actorId, datasetSchema, redashApiKey, ...queryParams }`
   - **Transformation needed**: Convert enhanced schema to validator format, add actorId and redashApiKey

4. **Dataset Schema Validator** → **Create PR Actor**:
   - Output: Validation results (not used directly)
   - Input: `{ datasetSchema, githubLink, githubToken, generateViews }`
   - **Transformation needed**: Use the enhanced schema from step 3, not validator output

**Key Data Transformations:**
- Schema format conversion between different Actor expectations
- Adding required parameters (actorName, actorId, tokens) at each step
- Converting between different schema formats (raw → enhanced → validator format → PR format)

### Technical Implementation Analysis (Question 3 - COMPLETED):

**Source Code Access**: ✅ **COMPLETED** - I have full access to all 5 Actor source codes
**Code Modification Policy**: ❌ **NO CHANGES** - I will NOT modify the existing Actor code, only integrate it

**API Endpoints & Services Used**:
- **OpenRouter API**: `https://openrouter.apify.actor/api/v1/chat/completions` (used by LLM Input Creator and LLM Schema Enhancer)
- **Redash API**: `https://charts.apify.com/api/queries/2039/results` (used by Dataset Schema Validator)
- **Apify API**: For running Actors and accessing datasets
- **GitHub API**: For creating PRs and managing repositories
- **External Validation Actor**: `jaroslavhejlek/validate-dataset-with-json-schema`

**Expected Runtime**: 
- LLM Input Creator: ~30-60 seconds (AI call)
- Dataset Schema Generator: ~2-5 minutes (runs target Actor 4 times)
- LLM Schema Enhancer: ~30-60 seconds (AI call)
- Dataset Schema Validator: ~1-3 minutes (Redash query + validation)
- Create PR Actor: ~30-60 seconds (GitHub operations)
- **Total**: ~5-10 minutes

### Error Handling & Edge Cases Analysis (Question 4 - COMPLETED):

**Failure Strategy**: ✅ **FAIL-FAST APPROACH** - Pipeline stops on any Actor failure
**Rate Limits**: 
- OpenRouter: No specific limits mentioned
- Redash: 30-second timeout for job completion
- GitHub: Standard API rate limits
- Apify: Standard Actor execution limits

**Edge Cases**:
- GitHub repo doesn't exist: Create PR Actor will fail with clear error
- Invalid tokens: Each Actor validates tokens and fails gracefully
- No datasets found: Dataset Schema Validator handles this case
- Actor doesn't exist: LLM Input Creator validates Actor exists first

### Output Requirements Analysis (Question 5 - COMPLETED):

**Final PR Contents**:
- ✅ **ONLY** `dataset_schema.json`: Complete enhanced schema with fields and views
- ❌ **NO** `actor.json` updates in PR
- **PR Title**: "Add dataset schema: [Actor Name]"
- **PR Description**: Automated description explaining the changes
- **Commit Message**: Structured message explaining the additions

### Current Understanding (UPDATED):
- ✅ **Actor Functionality**: All 5 Actors analyzed and understood
- ✅ **Data Flow**: Complete data flow mapped with required transformations
- ✅ **Technical Details**: All APIs, endpoints, and dependencies identified
- ✅ **Error Handling**: Failure strategies and edge cases defined
- ✅ **Output Requirements**: PR contents and format specified
- ✅ **Tech Stack**: TypeScript + Apify SDK (no Crawlee needed)

### Implementation Plan Ready:

**Architecture**: Create a SuperActor that orchestrates the 5 existing Actors in sequence, with proper data transformations between each step.

**Key Integration Points**:
1. **LLM Input Creator** → Direct integration (no changes needed)
2. **Dataset Schema Generator** → Direct integration (no changes needed)  
3. **LLM Schema Enhancer** → Direct integration (no changes needed)
4. **Dataset Schema Validator** → Direct integration (no changes needed)
5. **Create PR Actor** → Direct integration (no changes needed)

**Data Flow Implementation**:
- Step 1: Call LLM Input Creator with `actorTechnicalName`
- Step 2: Pass result to Dataset Schema Generator
- Step 3: Extract schema and call LLM Schema Enhancer
- Step 4: Use enhanced schema to call Dataset Schema Validator
- Step 5: Use enhanced schema to call Create PR Actor (modified to only include dataset_schema.json)

**Key Implementation Notes**:
- ❌ **NO CODE MODIFICATIONS** to existing Actors
- ✅ **FAIL-FAST** error handling - stop on any failure
- ✅ **ONLY** dataset_schema.json in PR (no actor.json updates)
- ✅ **DIRECT INTEGRATION** - use existing Actor code as-is

### Implementation Plan (UPDATED with User Clarifications):

**SuperActor Architecture**:
```
DatasetSchemaSuperActor
├── Input: { actorTechnicalName, githubLink, githubToken, redashToken, generateViews, daysBack, maximumResults, minimumResults, runsPerUser }
├── Step 1: LLMInputCreator.generateTestInputs(actorTechnicalName)
├── Step 2: DatasetSchemaGenerator.runActorWithInputs(testInputs)
├── Step 3: LLMSchemaEnhancer.enhanceSchema(schema, generateViews)
├── Step 4: DatasetSchemaValidator.processValidation(enhancedSchema, redashToken, ...)
├── Step 5: CreatePRActor.run(enhancedSchema, githubLink, githubToken) [MODIFIED - only dataset_schema.json]
└── Output: { success, prUrl, progress, details }
```

**Key Modifications Needed**:
1. **Create PR Actor**: Modify to only include `dataset_schema.json` in PR (no `actor.json` updates)
2. **Error Handling**: Implement fail-fast approach - stop on any Actor failure
3. **Data Transformations**: Handle schema format conversions between Actors
4. **Integration**: Direct integration of existing Actor code without modifications

### Next Steps:
**Ready to proceed with implementation!** All questions answered, detailed plan available.
