/** @jsx jsx */

import { jsx } from '../../../helpers'

export const run = editor => {
  editor.delete()
}

export const input = (
  <value>
    <block>
      <cursor />
    </block>
    <block void>
      <text />
    </block>
  </value>
)

export const output = (
  <value>
    <block>
      <cursor />
    </block>
  </value>
)