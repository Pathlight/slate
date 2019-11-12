/** @jsx jsx */

import { jsx } from '../../helpers'

export const input = (
  <value>
    <block>one</block>
  </value>
)

export const run = editor => {
  return editor.getStart([0])
}

export const output = { path: [0, 0], offset: 0 }