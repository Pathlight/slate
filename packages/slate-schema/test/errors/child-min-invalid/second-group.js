/** @jsx h */

import { h } from '../../helpers'

export const schema = {
  blocks: {
    a: {
      validate: {
        children: [{ max: 1 }, { min: 1 }],
      },
    },
  },
}

export const input = (
  <value>
    <a>
      <b>one</b>
    </a>
  </value>
)

export const output = <value />
