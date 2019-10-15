/** @jsx h */

import { h } from '../../../helpers'

export const run = editor => {
  editor.delete()
}

export const input = (
  <value>
    
      <block>
        on<anchor />e
      </block>
      <image>
        <focus />
      </image>
      <block>three</block>
    
  </value>
)

export const output = (
  <value>
    
      <block>
        on<cursor />
      </block>
      <block>three</block>
    
  </value>
)
