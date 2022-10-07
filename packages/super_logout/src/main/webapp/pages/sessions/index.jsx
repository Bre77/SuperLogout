import React from 'react';

import layout from '@splunk/react-page';
import Sessions from '@splunk/sessions';
import { getUserTheme, getThemeOptions } from '@splunk/splunk-utils/themes';

import { StyledContainer } from './StartStyles';

getUserTheme()
    .then((theme) => {
        const splunkTheme = getThemeOptions(theme);
        layout(
            <StyledContainer>
                <Sessions />
            </StyledContainer>,
            splunkTheme
        );
    })
    .catch((e) => {
        const errorEl = document.createElement('span');
        errorEl.innerHTML = e;
        document.body.appendChild(errorEl);
    });
