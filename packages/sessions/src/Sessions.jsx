import React, { useState, useEffect } from 'react';
import Search from '@splunk/react-ui/Search';
import Heading from '@splunk/react-ui/Heading';
import Table from '@splunk/react-ui/Table';
import Button from '@splunk/react-ui/Button';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Modal from '@splunk/react-ui/Modal';
import { defaultFetchInit, handleError, handleResponse } from '@splunk/splunk-utils/fetch';

const endpoint = `${window.$C.SPLUNKD_PATH}/services/authentication/httpauth-tokens`;

const columns = [
    { sortKey: 'userName', label: 'User Name' },
    { sortKey: 'sessionsCount', label: 'Sessions' },
    { sortKey: 'searchesCount', label: 'Searches' },
];

const deleteFetchInit = Object.assign({}, defaultFetchInit, { 'method': 'DELETE' });

async function getSessions() {
    return fetch(`${endpoint}?output_mode=json&count=0`, {
        ...defaultFetchInit,
    }).then(handleResponse(200))
}

async function removeSession(id) {
    return fetch(`${endpoint}/${id}?output_mode=json`, {
        ...deleteFetchInit
    }).then(handleResponse(200))
}

const Sessions = () => {
    const [sessions, setSessions] = useState([]);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('timeAccessed');
    const [sortDir, setSortDir] = useState('desc');
    const [error, setError] = useState(false);

    const refresh = () => {
        return getSessions().then((r) => {
            const users = r.entry.reduce((users, entry) => {
                console.log(users)
                if (!(entry.content.userName in users)) {
                    users[entry.content.userName] = {
                        'sessions': [],
                        'searches': []
                    }
                }
                console.log(entry.content.searchId)
                const type = entry.content.searchId == "" ? 'sessions' : 'searches';
                users[entry.content.userName][type].push({
                    "id": entry.name,
                    "timeAccessed": entry.content.timeAccessed,
                    "searchId": entry.content.searchId, //Maybe redundant
                })
                return users
            }, {});
            const list = Object.entries(users).map(([userName, data]) => {
                return Object.assign(data, {
                    userName: userName,
                    sessionsCount: data.sessions.length,
                    searchesCount: data.searches.length,
                })
            })
            setSessions(list);
        });
    }

    useEffect(() => {
        refresh()
    }, []);

    const handleSearch = (e, { value: searchValue }) => {
        setSearch(searchValue);
    };

    const handleSort = (e, col) => {
        setSortKey(col.sortKey)
        setSortDir((col.sortKey === sortKey && sortDir === 'asc') ? 'desc' : 'asc')
    };

    const handleLogout = (e, name) => {
        removeSession(name)
            .then(() => {
                console.log(`Session ${name} removed`)
            })
            .catch((error) => { console.warn(`Failed to remove session ${name}, got status ${error.status}`) })
            .then(refresh)
    };

    return (
        <>
            <Heading level={1}>Super Logout</Heading>
            <p>Active sessions in Splunk are shown below. From here you can delete these sessions, which can be useful if an account has been removed.</p>
            <ControlGroup label="Search for User">

                <Search aria-controls="user-search" onChange={handleSearch} value={search} />
                <Button selected appearance="primary" label="Manual Refresh" onClick={refresh} />
            </ControlGroup>
            <Table stripeRows>
                <Table.Head>
                    {columns.map((column) => (
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
                    {sessions
                        .sort((rowA, rowB) => {
                            if (sortDir === 'asc') {
                                return rowA[sortKey] > rowB[sortKey] ? 1 : -1;
                            }
                            if (sortDir === 'desc') {
                                return rowB[sortKey] > rowA[sortKey] ? 1 : -1;
                            }
                            return 0;
                        }).filter(s => (
                            !search || s.userName.toLowerCase().includes(search.toLowerCase())
                        ))
                        .map(s => (
                            <Table.Row key={s.userName}>
                                <Table.Cell>{s.userName}</Table.Cell>
                                <Table.Cell>{s.sessionsCount}</Table.Cell>
                                <Table.Cell>{s.searchesCount}</Table.Cell>
                                <Table.Cell onClick={handleLogout} data={s.name}>Logout All</Table.Cell>
                            </Table.Row>
                        ))}
                </Table.Body>
            </Table>
        </>
    )
}

export default Sessions;
