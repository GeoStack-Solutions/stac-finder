# Contributing Guidelines

## 1. Branching Strategy

We use **Main and Dev branches**:

- **`main`**  
  - Stable, deployable version  
  - No direct pushes allowed  
  - Changes must go through Pull Requests from `dev` or hotfix branches

- **`dev`**  
  - Integration branch for all new features  
  - Feature branches are merged here via Pull Requests  
  - Status checks (tests) should pass before merging  
  - No direct pushes; only PRs

- **Feature Branches**  
  - Fork the original repository from GeoStackSolutions/StackFinder 
  - **Untick Checkbox "Copy the main branch only"**
  - Clone repository in VSCode by using the https link
  - Create new branch from `dev`
  - Each developer works on their own branch based on `dev`  
  - Branch naming: `feature/<short-description>` or `bugfix/<short-description>` ...  

---

## 2. Pull Requests (PRs)

- All changes to `dev` or `main` must go through a PR   
- At least one team member must review each PR  
- PRs must satisfy the following:
  - All status checks pass
  - All comments/conversations resolved  
  - Branch is up-to-date with `dev` (for PRs to `main`)  

---

## 3. Commit Guidelines

- Write **clear and meaningful commit messages**: <Type>: <Short description>
- Example:
  - feat: Implement login form  
  - fix: Fix navbar bug  
  - docs: Update README
- Commit types:
  - `feat` → new feature  
  - `fix` → bug fix  
  - `docs` → documentation  
  - `refactor` → code refactoring  
  - `test` → add/update tests    