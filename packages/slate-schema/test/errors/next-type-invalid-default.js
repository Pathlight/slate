/** @jsx jsx */

import { jsx } from '../../helpers'

export const schema = {
  blocks: {
    paragraph: {
      next: [{ type: 'paragraph' }],
    },
  },
}

export const input = (
  <value>
    <document>
      <block>
        <text />
      </block>
      <block void>
        <text />
      </block>
    </document>
  </value>
)

export const output = (
  <value>
    <document>
      <block>
        <text />
      </block>
    </document>
  </value>
)