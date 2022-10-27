import React from 'react';

import layout from '@splunk/react-page';
import Sessions from '@splunk/sessions';
import { getUserTheme } from '@splunk/splunk-utils/themes';

import { StyledContainer, GlobalStyle } from './styles';

getUserTheme()
    .then((theme) => {
        layout(
            <StyledContainer>
                <GlobalStyle />
                <Sessions />
            </StyledContainer>,
            { theme }
        );
    })
    .catch((e) => {
        const errorEl = document.createElement('span');
        errorEl.innerHTML = e;
        document.body.appendChild(errorEl);
    });
