import React, { useState } from 'react';
import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyledContainer, GlobalStyle } from './styles';

import layout from '@splunk/react-page';
import { getUserTheme } from '@splunk/splunk-utils/themes';
import Search from '@splunk/react-ui/Search';
import Table from '@splunk/react-ui/Table';
import Button from '@splunk/react-ui/Button';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import { defaultFetchInit, handleResponse } from '@splunk/splunk-utils/fetch';
import { splunkdPath } from '@splunk/splunk-utils/config';

const endpoint = `${splunkdPath}/services/authentication/httpauth-tokens`;

const COLUMNS = [
    { sortKey: 'userName', label: 'User Name' },
    { sortKey: 'sessionsCount', label: 'Sessions' },
    { sortKey: 'minTime', label: 'Oldest Use' },
];

async function getSessions() {
    return fetch(
        `${endpoint}?output_mode=json&count=0&f=userName&f=timeAccessed&search=searchId%3D""`,
        defaultFetchInit
    ).then(handleResponse(200));
}

async function removeSession(id) {
    return fetch(`${endpoint}/${id}?output_mode=json`, {
        ...defaultFetchInit,
        method: 'DELETE',
    }).then(handleResponse(200));
}

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5000,
            refetchInterval: 30000,
        },
    },
});

const Sessions = () => {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('userName');
    const [sortDir, setSortDir] = useState('desc');

    const {
        data: users,
        isFetching,
        refetch,
    } = useQuery(['sessions'], () =>
        getSessions().then((r) => {
            const userDict = r.entry.reduce((x, entry) => {
                if (!(entry.content.userName in x)) {
                    x[entry.content.userName] = {
                        sessions: [],
                        minTime: entry.content.timeAccessed,
                        //'maxTime': entry.content.timeAccessed,
                    };
                }
                x[entry.content.userName]['sessions'].push({
                    id: entry.name,
                    timeAccessed: entry.content.timeAccessed,
                });
                //if (entry.content.timeAccessed > x[entry.content.userName]['maxTime']) {
                //    x[entry.content.userName]['maxTime'] = entry.content.timeAccessed
                //}
                if (entry.content.timeAccessed < x[entry.content.userName]['minTime']) {
                    x[entry.content.userName]['minTime'] = entry.content.timeAccessed;
                }
                return x;
            }, {});
            return Object.entries(userDict).map(([userName, data]) => {
                return Object.assign(data, {
                    userName: userName,
                    sessionsCount: data.sessions.length,
                });
            });
        })
    );

    const handleLogout = (_, id) => removeSession(id).then(refetch);
    const handleLogouts = (_, ids) =>
        Promise.all(ids.map((s) => removeSession(s.id))).then(refetch);

    const handleSearch = (_, { value }) => setSearch(value);

    const handleSort = (_, col) => {
        setSortKey(col.sortKey);
        setSortDir(col.sortKey === sortKey && sortDir === 'asc' ? 'desc' : 'asc');
    };

    //  colSpan={1}
    const expandSession = (u) => {
        return u.sessions.map((s) => (
            <Table.Row key={`${u.userName}-${s.id}`}>
                <Table.Cell></Table.Cell>
                <Table.Cell
                    onClick={handleLogout}
                    data={[s.id]}
                    colSpan={COLUMNS.length}
                    style={{ paddingBottom: 6 }}
                >
                    Logout {s.timeAccessed}
                </Table.Cell>
            </Table.Row>
        ));
    };

    return (
        <>
            <ControlGroup label="Search for User">
                <Search aria-controls="user-search" onChange={handleSearch} value={search} />
                <Button selected appearance="primary" onClick={refetch} disabled={isFetching}>
                    {isFetching ? 'Refreshing' : 'Manual Refresh'}
                </Button>
            </ControlGroup>
            <Table stripeRows rowExpansion="single">
                <Table.Head>
                    {COLUMNS.map((column) => (
                        <Table.HeadCell
                            key={column.sortKey}
                            onSort={handleSort}
                            sortKey={column.sortKey}
                            sortDir={column.sortKey === sortKey ? sortDir : 'none'}
                        >
                            {column.label}
                        </Table.HeadCell>
                    ))}
                    <Table.HeadCell key="action">Action</Table.HeadCell>
                </Table.Head>
                <Table.Body>
                    {users &&
                        users
                            .sort((rowA, rowB) => {
                                if (sortDir === 'asc') {
                                    return rowA[sortKey] > rowB[sortKey] ? 1 : -1;
                                }
                                if (sortDir === 'desc') {
                                    return rowB[sortKey] > rowA[sortKey] ? 1 : -1;
                                }
                                return 0;
                            })
                            .filter(
                                (u) =>
                                    !search ||
                                    u.userName.toLowerCase().includes(search.toLowerCase())
                            )
                            .map((u) => (
                                <Table.Row key={u.userName} expansionRow={expandSession(u)}>
                                    {COLUMNS.map((c, x) => (
                                        <Table.Cell key={x}>{u[c.sortKey]}</Table.Cell>
                                    ))}
                                    <Table.Cell onClick={handleLogouts} data={u.sessions}>
                                        Logout All
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                </Table.Body>
            </Table>
        </>
    );
};

getUserTheme()
    .then((theme) => {
        layout(
            <StyledContainer>
                <GlobalStyle />
                <QueryClientProvider client={queryClient}>
                    <p>
                        Active HTTP authentication sessions on this Splunk server are shown below.
                        With this tool you can remove these sessions, which is useful if an account
                        has been removed from your identity provider. Search authentications are not
                        shown intentionally, as terminating these has no value.
                    </p>
                    <Sessions />
                </QueryClientProvider>
            </StyledContainer>,
            { theme }
        );
    })
    .catch((e) => {
        const errorEl = document.createElement('span');
        errorEl.innerHTML = e;
        document.body.appendChild(errorEl);
    });
