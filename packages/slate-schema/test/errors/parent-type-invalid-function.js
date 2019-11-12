/** @jsx jsx */

import { jsx } from '../../helpers'

export const schema = {
  blocks: {
    list: {},
    item: {
      parent: { type: t => t === 'list' },
    },
  },
}

export const input = (
  <value>
    <document>
      <block>
        <block>
          <text />
        </block>
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