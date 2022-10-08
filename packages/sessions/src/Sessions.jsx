import React, { useState, useEffect } from 'react';
import Search from '@splunk/react-ui/Search';
import Heading from '@splunk/react-ui/Heading';
import Table from '@splunk/react-ui/Table';
import Button from '@splunk/react-ui/Button';
import ControlGroup from '@splunk/react-ui/ControlGroup';
import Clickable from '@splunk/react-ui/Clickable';
import { defaultFetchInit, handleError, handleResponse } from '@splunk/splunk-utils/fetch';

const endpoint = `${window.$C.SPLUNKD_PATH}/services/authentication/httpauth-tokens`;

const COLUMNS = [
    { sortKey: 'userName', label: 'User Name' },
    { sortKey: 'sessionsCount', label: 'Sessions' },
    { sortKey: 'minTime', label: 'Oldest Use' },
];

const deleteFetchInit = Object.assign({}, defaultFetchInit, { 'method': 'DELETE' });

async function getSessions() {
    return fetch(`${endpoint}?output_mode=json&count=0&f=userName&f=timeAccessed&search=searchId%3D""`, {
        ...defaultFetchInit,
    }).then(handleResponse(200))
}

async function removeSession(id) {
    console.debug(`${endpoint}/${id}?output_mode=json`)
    return fetch(`${endpoint}/${id}?output_mode=json`, {
        ...deleteFetchInit
    }).then(handleResponse(200))
}

const Sessions = () => {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('userName');
    const [sortDir, setSortDir] = useState('desc');
    const [error, setError] = useState(false);

    const refresh = () => {
        return getSessions().then((r) => {
            const userDict = r.entry.reduce((x, entry) => {
                if (!(entry.content.userName in x)) {
                    x[entry.content.userName] = {
                        'sessions': [],
                        'minTime': entry.content.timeAccessed,
                        //'maxTime': entry.content.timeAccessed,
                    }
                }
                x[entry.content.userName]['sessions'].push({
                    "id": entry.name,
                    "timeAccessed": entry.content.timeAccessed
                })
                //if (entry.content.timeAccessed > x[entry.content.userName]['maxTime']) {
                //    x[entry.content.userName]['maxTime'] = entry.content.timeAccessed
                //}
                if (entry.content.timeAccessed < x[entry.content.userName]['minTime']) {
                    x[entry.content.userName]['minTime'] = entry.content.timeAccessed
                }
                return x
            }, {});
            const userArray = Object.entries(userDict).map(([userName, data]) => {
                return Object.assign(data, {
                    userName: userName,
                    sessionsCount: data.sessions.length,
                })
            })
            setUsers(userArray);
        });
    }

    useEffect(() => {
        refresh()
    }, []);

    const handleSearch = (_, { value: searchValue }) => {
        setSearch(searchValue);
    };

    const handleSort = (_, col) => {
        setSortKey(col.sortKey)
        setSortDir((col.sortKey === sortKey && sortDir === 'asc') ? 'desc' : 'asc')
    };

    const handleLogout = (_, id) => {
        removeSession(id)
            .then(() => {
                console.log(`Session ${id} removed`)
            })
            .catch((error) => { console.warn(`Failed to remove session ${id}, got status ${error.status}`) })
            .then(refresh)
    };

    const handleLogoutAll = (_, sessions) => {
        Promise.all(sessions.map((s) => 
            removeSession(s.id)
            .then(console.log(`Session ${s.id} removed`))
            .catch(error => console.warn(`Failed to remove session ${s.id}, got status ${error.status}`))
        )).then(refresh)
    };

    //  colSpan={1}
    const expandSession = (u) => {
        return u.sessions.map((s) => (
            <Table.Row key={`${u.userName}-${s.id}`}>
                <Table.Cell></Table.Cell>
                <Table.Cell onClick={handleLogout} data={s.id} colSpan={COLUMNS.length} style={{ paddingBottom: 6 }}>Logout {s.timeAccessed}</Table.Cell>
            </Table.Row>
        ))
    }

    return (
        <>
            <p>Active HTTP authentication sessions on this Splunk server are shown below. With this tool you can remove these sessions, which is useful if an account has been removed from you identity provider. Search authentications are not shown intentionally, as terminating these has no value.</p>
            <ControlGroup label="Search for User">

                <Search aria-controls="user-search" onChange={handleSearch} value={search} />
                <Button selected appearance="primary" label="Manual Refresh" onClick={refresh} />
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
                    {users
                        .sort((rowA, rowB) => {
                            if (sortDir === 'asc') {
                                return rowA[sortKey] > rowB[sortKey] ? 1 : -1;
                            }
                            if (sortDir === 'desc') {
                                return rowB[sortKey] > rowA[sortKey] ? 1 : -1;
                            }
                            return 0;
                        }).filter(u => (
                            !search || u.userName.toLowerCase().includes(search.toLowerCase())
                        ))
                        .map(u => (
                            <Table.Row key={u.userName} expansionRow={expandSession(u)}>
                                { COLUMNS.map((c,x) => <Table.Cell key={x}>{u[c.sortKey]}</Table.Cell>) }
                                <Table.Cell onClick={handleLogoutAll} data={u.sessions}>Logout All</Table.Cell>
                            </Table.Row>
                        ))}
                </Table.Body>
            </Table>
        </>
    )
}

export default Sessions;
