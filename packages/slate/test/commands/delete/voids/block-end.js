/** @jsx jsx */

import { jsx } from '../../../helpers'

export const run = editor => {
  editor.delete()
}

export const input = (
  <value>
    <block>
      wo<anchor />rd
    </block>
    <block void>
      an<focus />other
    </block>
  </value>
)

export const output = (
  <value>
    <block>
      wo<cursor />
    </block>
  </value>
)