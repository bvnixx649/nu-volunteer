// Publishes dist/ to the gh-pages branch with the GitHub CLI account (not the system default credential).
import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const remote = execSync('git remote get-url origin').toString().trim()
const cred = `-c credential.helper= -c "credential.helper=!'C:/Program Files/GitHub CLI/gh.exe' auth git-credential"`
const run = (cmd) => execSync(cmd, { cwd: 'dist', stdio: 'inherit' })

rmSync('dist/.git', { recursive: true, force: true })
run('git init -q -b gh-pages')
run('git add -A')
run('git -c user.name=bvnixx649 -c user.email=luciomoret649@gmail.com commit -qm "Deploy"')
run(`git ${cred} push -f ${remote} gh-pages`)
rmSync('dist/.git', { recursive: true, force: true })
