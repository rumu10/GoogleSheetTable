// src/App.js
import React, { useState, useEffect } from 'react';
import { Table, message, Layout, Typography } from 'antd';
import 'antd/dist/reset.css';
import { Input, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';


const { Content, Header } = Layout;
const { Title } = Typography;

// Read env vars (CRA automatically injects these)
const API_KEY = "AIzaSyCvuBBS1db8RB-5cP8Oi_-PaqkBPk7LPTo";

const SHEET_ID = "16nQXyw4Yh8hkTo4Xhci04cuU-GCKkLFG9hqng-7ZHR4";
const RANGE = "Sheet1!A1:Z";


// Number of rows per page in the Table
const PAGE_SIZE = 25;

function SheetTable() {
    const [loading, setLoading] = useState(true);
    const [columns, setColumns] = useState([]);   // antd column definitions
    const [dataSource, setDataSource] = useState([]); // row data array
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');


    const columnDisplayNames = {
        name: "Gamer Tag",
        score: "Score",
        date: "Date"
        // Add other columns as needed
    };


    useEffect(() => {
        // Build the Sheets API URL
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(
            RANGE
        )}?key=${API_KEY}`;

        fetch(url)
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch Google Sheet data');
                return res.json();
            })
            .then((data) => {
                if (!data.values || data.values.length < 2) {
                    throw new Error('No data or not enough rows in sheet');
                }

                // 1) Extract header row (first array element)
                const headerRow = data.values[0]; // e.g. ['Name', 'Score', 'Date', ...]
                // 2) Find index of "Score" column
                const scoreIdx = headerRow.findIndex((h) => h === 'score');
                if (scoreIdx === -1) {
                    throw new Error('Column "Score" not found in header');
                }

                // 3) Parse the remaining rows and attach a numeric score for sorting
                const parsed = data.values.slice(1).map((row) => {
                    const rawScore = row[scoreIdx];
                    const numScore = parseFloat(rawScore ?? '0');
                    return {
                        _raw: row,
                        score: isNaN(numScore) ? 0 : numScore,
                    };
                });

                // 4) Sort descending by score
                parsed.sort((a, b) => b.score - a.score);

                // 5) Build antd columns based on headerRow
                const cols = headerRow.map((colName, colIndex) => ({
                    // Use mapped name if it exists, otherwise fallback to Google Sheets name
                    title: columnDisplayNames[colName] || colName,
                    dataIndex: `col_${colIndex}`,
                    key: `col_${colIndex}`,
                    sorter: (a, b) => {
                        if (colIndex === scoreIdx) {
                            return a[`col_${colIndex}`] - b[`col_${colIndex}`];
                        }
                        const valA = a[`col_${colIndex}`] ?? '';
                        const valB = b[`col_${colIndex}`] ?? '';
                        return String(valA).localeCompare(String(valB));
                    },
                    sortDirections: ['descend', 'ascend'],
                }));


                // 6) Build dataSource array: each object has keys col_0, col_1, etc.
                const rowsData = parsed.map((obj, rowIndex) => {
                    const cells = obj._raw; // array of strings
                    const rowObj = { key: rowIndex }; // antd Table requires a unique key
                    // Map each cell to col_i
                    headerRow.forEach((_, colIndex) => {
                        let rawValue = cells[colIndex];
                        // If this is the score column, store as number; else string
                        if (colIndex === scoreIdx) {
                            const n = parseFloat(rawValue ?? '0');
                            rowObj[`col_${colIndex}`] = isNaN(n) ? 0 : n;
                        } else {
                            rowObj[`col_${colIndex}`] = rawValue ?? '';
                        }
                    });
                    return rowObj;
                });

                setColumns(cols);
                setDataSource(rowsData);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError(err.message);
                setLoading(false);
                message.error(err.message);
            });
    }, []);

    const scoreColumnKey = 'score'; // Use the actual key for your "score" column
    const maxScore = dataSource.length > 0 ? Math.max(...dataSource.map(row => row[scoreColumnKey])) : null;
    console.log(maxScore);

    // Identify which column index is the "name" (gamer tag) column
    const nameColIndex = columns.findIndex(col => col.title === "Gamer Tag");
    // If not found, fallback to 0 (first column)
    const gamerTagKey = nameColIndex !== -1 ? columns[nameColIndex].dataIndex : 'col_0';

    const filteredData = dataSource.filter(row =>
        row[gamerTagKey]?.toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ background: '#001529', padding: '0 1rem' }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>
                    SuperTux Scoreboard
                </Title>
            </Header>

            <Content style={{ padding: '1rem', background: '#f0f2f5' }}>
                {error && (
                    <div style={{ color: 'red', marginBottom: '1rem' }}>
                        Error: {error}
                    </div>
                )}

                <Space style={{ marginBottom: 16 }}>
                    <Input
                        placeholder="Search by Gamer Tag"
                        prefix={<SearchOutlined />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                        style={{ width: 500, height: 38, fontSize: 20 }}
                    />
                </Space>


                <Table
                    columns={columns}
                    dataSource={filteredData}
                    loading={loading}
                    pagination={{ pageSize: PAGE_SIZE }}
                    bordered
                    size="large"
                    scroll={{ x: 'max-content' }}
                    className="scoreboard-table"
                    rowClassName={(record) => {
                        return record[scoreColumnKey] === maxScore ? 'top-score-row' : '';
                    }}
                />

            </Content>
        </Layout>
    );
}

export default SheetTable;
