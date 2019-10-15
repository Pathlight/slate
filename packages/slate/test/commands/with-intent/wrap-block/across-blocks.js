/** @jsx h */

import { h } from '../../../helpers'

export const run = editor => {
  editor.wrapBlock('quote')
}

export const input = (
  <value>
    
      <block>
        wo<anchor />rd
      </block>
      <block>
        an<focus />other
      </block>
    
  </value>
)

export const output = (
  <value>
    
      <block>
        <block>
          wo<anchor />rd
        </block>
        <block>
          an<focus />other
        </block>
      </block>
    
  </value>
)
