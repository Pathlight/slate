/** @jsx h */

import { h } from '../../../helpers'

export const run = editor => {
  editor.moveForward(6)
}

export const input = (
  <value>
    
      <block>
        one <cursor />two three
      </block>
    
  </value>
)

export const output = (
  <value>
    
      <block>
        one two th<cursor />ree
      </block>
    
  </value>
)
