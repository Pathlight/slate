/** @jsx jsx  */

import { Node } from 'slate'
import { jsx } from 'slate-hyperscript'

export const input = (
  <value>
    <element>
      <text />
    </element>
  </value>
)

export const test = value => {
  return Array.from(Node.levels(value, [0, 0]))
}

export const output = [
  [input, []],
  [input.children[0], [0]],
  [input.children[0].children[0], [0, 0]],
]