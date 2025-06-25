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
const PAGE_SIZE = 15;

function SheetTable() {
    const [loading, setLoading] = useState(true);
    const [columns, setColumns] = useState([]);   // antd column definitions
    const [dataSource, setDataSource] = useState([]); // row data array
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');

    const [maxScore, setMaxScore] = useState([]);


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
                // Choose only the columns you want to show
                const nameIdx = headerRow.findIndex((h) => h === 'name');
                const dateIdx = headerRow.findIndex((h) => h === 'date');

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
                parsed.sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return b._raw[dateIdx].localeCompare(a._raw[dateIdx]);
                  });


                // 5) Build antd columns based on headerRow
                const cols = [
                    {
                        title: "Rank",
                        dataIndex: "rank",
                        key: "rank",
                        align: "center",
                        sorter: (a, b) => a.rank - b.rank,
                        sortDirections: ['ascend', 'descend'],
                        width: 80,
                        className: "rank-column-cell",
                        render: (text, record) => (
                            <span>
                              {text === 1 && (
                                <span role="img" aria-label="trophy" style={{ marginRight: 4, fontSize: 24 }}>
                                  🏆
                                </span>
                              )}
                              {text}
                            </span>
                          ),
                    },
                    {
                        title: columnDisplayNames['date'],
                        dataIndex: `col_${dateIdx}`,
                        key: `col_${dateIdx}`,
                        sorter: (a, b) => String(a[`col_${dateIdx}`]).localeCompare(String(b[`col_${dateIdx}`])),
                        sortDirections: ['descend', 'ascend'],
                    },
                    {
                        title: columnDisplayNames['name'],
                        dataIndex: `col_${nameIdx}`,
                        key: `col_${nameIdx}`,
                        sorter: (a, b) => String(a[`col_${nameIdx}`]).localeCompare(String(b[`col_${nameIdx}`])),
                        sortDirections: ['descend', 'ascend'],
                    },
                    {
                        title: columnDisplayNames['score'],
                        dataIndex: `col_${scoreIdx}`,
                        key: `col_${scoreIdx}`,
                        sorter: (a, b) => a[`col_${scoreIdx}`] - b[`col_${scoreIdx}`],
                        sortDirections: ['descend', 'ascend'],
                    }
                ];



                // 6) Build dataSource array: each object has keys col_0, col_1, etc.
                let lastScore = null;
                let lastRank = 0;
                let date = new Date().toISOString(); // Get today's date in YYYY-MM-DD format

                parsed.forEach((item, idx) => {
                    item.rank = idx + 1;
                  });

                const maxScore = parsed.length > 0 ? parsed[0].score : null;


                const rowsData = parsed.map((obj, rowIndex) => {
                    const cells = obj._raw;
                    const rowObj = { key: rowIndex };
                    // Only add the selected columns
                    rowObj[`col_${nameIdx}`] = cells[nameIdx] ?? '';
                    rowObj[`col_${scoreIdx}`] = parseFloat(cells[scoreIdx] ?? '0');
                    rowObj[`col_${dateIdx}`] = cells[dateIdx] ?? '';
                    // Add rank
                    rowObj.rank = obj.rank;
                    return rowObj;
                });



                setColumns(cols);
                setDataSource(rowsData);
                setLoading(false);
                setMaxScore(maxScore);
            })
            .catch((err) => {
                console.error(err);
                setError(err.message);
                setLoading(false);
                message.error(err.message);
            });
    }, []);

    // Identify which column index is the "name" (gamer tag) column
    const nameColIndex = columns.findIndex(col => col.title === "Gamer Tag");
    // If not found, fallback to 0 (first column)
    const gamerTagKey = nameColIndex !== -1 ? columns[nameColIndex].dataIndex : 'col_0';

    const filteredData = dataSource.filter(row =>
        row[gamerTagKey]?.toLowerCase().includes(searchText.toLowerCase())
    );

    // In your render function (before return)
    const scoreCol = columns.find(col => col.title === columnDisplayNames['score']);
    const scoreKey = scoreCol ? scoreCol.dataIndex : null;


    return (
        <Layout style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f2027 0%,rgb(67, 45, 64) 50%,rgb(32, 12, 133) 100%)' }}>
            <Header style={{ background: 'transparent', padding: '0 0rem' }}>
                <Title
                    level={4}
                    style={{
                        color: '#fff',
                        background: 'linear-gradient(135deg, #0f2027 0%,rgb(67, 45, 64) 50%,rgb(47, 41, 75) 100%)',
                        margin: 0,
                        textAlign: 'center',
                        lineHeight: '84px', // or your Header height for vertical centering
                        fontSize: 35,
                        fontWeight: 700,
                        letterSpacing: 1,
                    }}
                >
                    SuperTux Scoreboard
                </Title>

            </Header>

            <Content style={{ padding: '5rem', background: 'transparent' }}>
                {error && (
                    <div style={{ color: 'red', marginBottom: '1rem' }}>
                        Error: {error}
                    </div>
                )}
              
                <Space style={{ marginBottom: 26 }}>
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
                    rowClassName={record =>
                        scoreKey && record[scoreKey] === maxScore ? 'top-score-row' : ''
                    }
                />

            </Content>
        </Layout>
    );
}

export default SheetTable;
