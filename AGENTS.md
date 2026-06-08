# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Git Commit & Push Guidelines
Whenever the user requests to push changes to GitHub (e.g., "깃허브에 push 해줘", "푸시해줘"), you MUST strictly follow this workflow:

1. **Commit Type Selection**: Select the appropriate prefix type based on the changes made:
   - `feat`: 새로운 기능 추가
   - `fix`: 버그 수정
   - `docs`: 문서 수정
   - `style`: 공백, 세미콜론 등 스타일 수정
   - `refactor`: 코드 리팩토링
   - `perf`: 성능 개선
   - `test`: 테스트 추가
   - `chore`: 빌드 과정 또는 보조 기능(문서 생성기능 등) 수정

2. **Commit Message Format**: Format the commit message as `<type>: <한국어 설명>` (always write the description in Korean).
   - *Example*: `feat: 냉장고 칸 내부 세로 스크롤 기능 추가`
   - *Example*: `fix: 기타 카테고리 텍스트 투명화 버그 수정`

3. **Staging & Push Sequence**: Run the following git commands sequentially:
   - `git add .`
   - `git commit -m '<type>: <한국어 설명>'` (use single quotes in PowerShell to prevent escaping issues)
   - `git push origin main` (or push to the active branch)

