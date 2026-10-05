import type { EngineInterface } from 'claude-code'
import type { GitEstado } from '../../types'

export async function medirGit($: EngineInterface): Promise<GitEstado | null> {
  try {
    const rev = await $.process.run(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
    if (rev.exitCode !== 0) {
      return null
    }
    const rama = rev.stdout.trim()
    if (!rama) {
      return null
    }

    const st = await $.process.run(['git', 'status', '--porcelain'])
    const sinCommit = st.exitCode === 0 ? st.stdout.split('\n').filter(Boolean).length : 0

    return { rama, sinCommit }
  } catch {
    return null
  }
}
