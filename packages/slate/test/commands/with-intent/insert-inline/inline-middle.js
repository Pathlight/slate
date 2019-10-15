/** @jsx h */

import { h } from '../../../helpers'

export const run = editor => {
  editor.insertInline('emoji')
}

export const input = (
  <value>
    
      <block>
        <inline>
          wo<cursor />rd
        </inline>
      </block>
    
  </value>
)

export const output = (
  <value>
    
      <block>
        <inline>
          wo<emoji>
            <cursor />
          </emoji>rd
        </inline>
      </block>
    
  </value>
)
