import * as path from 'path'
import * as os from 'os'

export const app = {
  getPath: (name: string) => {
    switch (name) {
      case 'userData':
        return path.join(os.tmpdir(), 'knowlex-test')
      default:
        return os.tmpdir()
    }
  }
}