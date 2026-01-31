# CI/CD Workflows

This directory contains GitHub Actions workflows for automated testing, building, and deployment.

## Workflows

### `ci-cd.yml` - Main CI/CD Pipeline

A comprehensive 3-stage pipeline that runs on every push to `main` or `develop` branches.

#### Stage 1: TEST
- **test-backend**: Tests database migrations, Edge Functions, and runs integration tests
- **test-frontend**: Lints, type-checks, and builds the main frontend application
- **test-hamdi-salon**: Builds and validates the Hamdi Salon booking app

#### Stage 2: BUILD
- **build-production**: Creates optimized production builds (only on `main` branch)

#### Stage 3: DEPLOY
- **deploy-supabase**: Deploys database migrations and Edge Functions to Supabase
- **deploy-vercel-frontend**: Deploys main frontend to Vercel
- **deploy-vercel-hamdi**: Deploys Hamdi Salon app to Vercel
- **post-deploy-validation**: Runs smoke tests against production

## Required Secrets

Configure these in your GitHub repository settings (Settings → Secrets and variables → Actions):

### Supabase
- `SUPABASE_ACCESS_TOKEN`: Your Supabase access token
- `SUPABASE_PROJECT_ID`: Your Supabase project reference ID
- `SUPABASE_DB_PASSWORD`: Database password
- `VITE_SUPABASE_URL`: Public Supabase URL (e.g., https://xxx.supabase.co)
- `VITE_SUPABASE_ANON_KEY`: Public anon key
- `SUPABASE_ANON_KEY_LOCAL`: Local development anon key
- `SUPABASE_SERVICE_ROLE_KEY_LOCAL`: Local development service role key

### Vercel
- `VERCEL_TOKEN`: Vercel authentication token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID for main frontend
- `VERCEL_HAMDI_PROJECT_ID`: Vercel project ID for Hamdi Salon app

### Additional
- `VITE_GEMINI_API_KEY`: Google Gemini API key for AI features

## Local Testing

To test the CI/CD pipeline locally:

```bash
# Install act (GitHub Actions local runner)
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run the test stage
act pull_request -j test-backend -j test-frontend

# Run the full pipeline (requires secrets)
act push --secret-file .secrets
```

## Deployment Flow

1. **Development**: Push to `develop` branch → Runs tests only
2. **Production**: Push/merge to `main` branch → Runs tests, builds, and deploys

## Manual Deployment

To manually trigger deployment:

1. Go to Actions tab in GitHub
2. Select "CI/CD Pipeline"
3. Click "Run workflow"
4. Choose branch and click "Run workflow"

## Monitoring

- View workflow runs in the Actions tab
- Check deployment status in the Vercel dashboard
- Monitor Edge Functions in Supabase dashboard → Edge Functions

## Troubleshooting

### Build Failures
- Check the logs in the Actions tab
- Verify all secrets are correctly set
- Ensure dependencies are up to date

### Deployment Failures
- Verify Vercel/Supabase tokens are valid
- Check project IDs match your projects
- Review migration files for syntax errors

### Test Failures
- Review test logs for specific failures
- Run tests locally with `python comprehensive_test.py`
- Check database schema matches migrations

## Adding New Workflows

To add a new workflow:

1. Create a new `.yml` file in this directory
2. Follow the same structure (name, on, jobs)
3. Add required secrets to GitHub
4. Test locally with `act` before pushing

## Best Practices

- Always run tests before deployment
- Use environment protection rules for production
- Keep secrets secure and rotate regularly
- Document any new secrets or environment variables
- Monitor deployment logs and error rates
