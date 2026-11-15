# Firebase Firestore deployment

This repository is configured for Firebase project `tutorsync-app` and the named Firestore database `ai-studio-fd3caff6-b7f7-4567-a716-bbb4cb0f70d6`.

The GitHub Actions workflow `.github/workflows/firebase-deploy.yml` is intentionally manual. It runs only from `main`, requires the exact confirmation `DEPLOY_FIRESTORE`, authenticates with Google Workload Identity Federation, checks that the named database already exists, and then deploys only the Firestore rules and indexes defined in `firebase.json`. It does not create databases, change database location, or deploy Hosting/Functions.

## 1. Confirm the target database

In Google Cloud Shell, sign in with an account that can view the project and run:

```bash
gcloud config set project tutorsync-app
gcloud firestore databases list
gcloud firestore databases describe ai-studio-fd3caff6-b7f7-4567-a716-bbb4cb0f70d6
```

The configured database ID must appear exactly. Do not create a replacement database with a guessed ID or region. A missing database is a stop condition: choose its edition, location, and deletion-protection settings deliberately before creating it.

## 2. Verify Google Authentication separately

The web app uses `signInWithPopup` and `GoogleAuthProvider`. In Firebase Console for `tutorsync-app`:

1. Open **Authentication → Sign-in method** and confirm **Google** is enabled with a support email.
2. Open **Authentication → Settings → Authorized domains** and add the exact production hostname shown by the Vercel deployment (hostname only; do not include `https://` or a path).
3. Keep `localhost` only if you need local development. Firebase no longer automatically authorizes localhost for projects created after April 28, 2025.
4. Test Google sign-in from the deployed Vercel site.

This workflow intentionally does not change Authentication provider settings. Confirm these settings separately before treating sign-in as production-ready.

## 3. Configure keyless GitHub authentication (recommended)

Use Google Cloud Shell or a workstation with the Google Cloud CLI authenticated as a project IAM administrator. This uses Workload Identity Federation instead of storing a long-lived service-account private key in GitHub.

```bash
set -euo pipefail

PROJECT_ID="tutorsync-app"
REPOSITORY="darkuser-007/Gurdian-Ai-"
POOL_ID="github-actions"
PROVIDER_ID="guardian-ai-main"
SERVICE_ACCOUNT_ID="guardian-firestore-deployer"
SERVICE_ACCOUNT="$SERVICE_ACCOUNT_ID@$PROJECT_ID.iam.gserviceaccount.com"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  firestore.googleapis.com \
  firebaserules.googleapis.com \
  firebase.googleapis.com \
  --project "$PROJECT_ID"

gcloud iam service-accounts create "$SERVICE_ACCOUNT_ID" \
  --project "$PROJECT_ID" \
  --display-name="Guardian AI Firestore deployer"

gcloud iam workload-identity-pools create "$POOL_ID" \
  --project "$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project "$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --display-name="Guardian AI main-only Firestore deployment" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.event_name=assertion.event_name,attribute.workflow_ref=assertion.workflow_ref" \
  --attribute-condition="assertion.repository == '$REPOSITORY' && assertion.ref == 'refs/heads/main' && assertion.event_name == 'workflow_dispatch' && assertion.workflow_ref == '$REPOSITORY/.github/workflows/firebase-deploy.yml@refs/heads/main'"

gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
  --project "$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$REPOSITORY"

# Least-privilege permissions for the workflow's database preflight,
# Firestore index changes, and Firestore Security Rules releases.
for ROLE in roles/datastore.viewer roles/datastore.indexAdmin roles/firebaserules.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="$ROLE"
done

echo "GCP_WORKLOAD_IDENTITY_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
echo "GCP_SERVICE_ACCOUNT=$SERVICE_ACCOUNT"
```

The Google Cloud project administrator must approve the IAM and Workload Identity changes above. Do not grant the deployer Owner or Editor.

## 4. Add GitHub repository variables

In GitHub, open **Settings → Secrets and variables → Actions → Variables** for this repository and add these two repository variables (not secrets):

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: the full provider resource printed by the script.
- `GCP_SERVICE_ACCOUNT`: the service-account email printed by the script.

No service-account JSON key is needed.

## 5. Run the deployment

Open **Actions → Guardian AI Firebase Firestore Deployment → Run workflow**, select branch `main`, and enter exactly:

```text
DEPLOY_FIRESTORE
```

The workflow verifies the checked-in app config and `firebase.json`, verifies the named database exists, then deploys rules and indexes. If the database preflight or authentication fails, deployment stops.

## Local alternative

From a trusted workstation with this repository checked out and Firebase CLI installed:

```bash
firebase login
firebase firestore:databases:get ai-studio-fd3caff6-b7f7-4567-a716-bbb4cb0f70d6 --project tutorsync-app
firebase deploy --only firestore --project tutorsync-app
```

Review the Firebase CLI output and confirm the target project/database before accepting the deployment.

## After deployment

1. In Firebase Console, switch to the named database and inspect its **Rules** release.
2. Confirm the `history` composite index (`ownerId` ascending, `timestamp` descending) is enabled/ready.
3. Test with two separate Google accounts: each account should create/read its own history, and should not read, update, or delete the other account's records.
4. Test history filtering/order and deleting a record from the app.

A successful rules/index deployment does not by itself verify Google sign-in, Vercel server credentials, Gemini requests, or end-to-end browser behavior.
