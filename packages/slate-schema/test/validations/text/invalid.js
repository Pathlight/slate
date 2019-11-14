/** @jsx jsx */

import { jsx } from 'slate-hyperscript'

export const schema = [
  {
    for: 'node',
    match: { a: true },
    validate: {
      text: v => v === 'valid',
    },
  },
]

export const input = (
  <value>
    <element a>invalid</element>
  </value>
)

export const output = <value />