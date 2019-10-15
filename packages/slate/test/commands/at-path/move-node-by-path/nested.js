/** @jsx h */

import { h } from '../../../helpers'

export const input = (
  <value>
    <block>
      <block>one</block>
    </block>
    <block>
      <block>two</block>
    </block>
  </value>
)

export const run = editor => {
  editor.moveNodeAtPath([0, 0], [1, 0])
}

export const output = (
  <value>
    <block>
      <text />
    </block>
    <block>
      <block>one</block>
      <block>two</block>
    </block>
  </value>
)
