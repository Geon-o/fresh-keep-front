---
name: git-commit-push
description: >-
  Safely handles git commit and push workflows. Use this skill whenever the user requests any git-related action — push to GitHub, commit this, push it, 올려줘, 푸시해줘, 커밋해줘, or any similar phrasing. Enforces Conventional Commits format with Korean descriptions, appropriate type selection, and mandatory user approval before executing any git command. Always use this skill for any git commit or push request — never run git commands automatically.
---

# Git Commit & Push Skill

When the user requests a git commit or push, always follow this workflow in order. Never run any git command without explicit user approval.

---

## Workflow

### Step 1 Inspect Changes

Run `git status` and `git diff` (or `git diff --staged`) to understand what has changed before composing a message.

### Step 2 Select Commit Type

Choose the type that best fits the changes

 Type  When to use 
-------------------
 `feat`  Adding a new feature 
 `fix`  Fixing a bug 
 `docs`  Documentation changes only 
 `style`  Whitespace, semicolons, formatting (no logic change) 
 `refactor`  Code restructuring without feature or bug changes 
 `perf`  Performance improvements 
 `test`  Adding or updating tests 
 `chore`  Build process, config, or tooling changes 

### Step 3 Write the Commit Message

Format `type Korean description`

- The description must always be written in Korean
- Be concise and specific about what changed
- Examples
  - `feat 냉장고 칸 내부 세로 스크롤 기능 추가`
  - `fix 기타 카테고리 텍스트 투명화 버그 수정`
  - `refactor 인증 로직 별도 훅으로 분리`

### Step 4 Get User Approval — CRITICAL, NEVER SKIP

Present the proposed commit message clearly in chat and wait for explicit approval before proceeding.

Example prompt to user
```
Shall I commit and push with this message

`feat 냉장고 칸 내부 세로 스크롤 기능 추가`
```

⚠️ Rules for interpreting approval
- Vague responses like 응, ㅇㅇ, 진행해, or go ahead only count as approval if the immediately preceding agent message was a clear commit proposal.
- If there is any ambiguity, ask again explicitly.
- Never auto-run git commands. Approval must come first, every time.

### Step 5 Execute After Approval

Once approved, run these commands in sequence

```bash
git add .
git commit -m 'type Korean description'
git push origin current-branch
```

- In PowerShell, use single quotes around the message to avoid escaping issues.
- Check the current branch with `git branch --show-current`

---

## Additional Rules

- Never commit conversation logs or context summary files to source code repositories.
- When multiple repositories are involved, confirm with the user which repo to push to before proceeding.
- If a merge conflict occurs, stop immediately, inform the user, and suggest resolution options.