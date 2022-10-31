import type { NextPage } from 'next'
import {useState} from 'react'
import Table from '../components/table'
import { getStats } from '../utils/api'

const limit = 5
const title = 'Dashboard'
const idColumn = 'time'
const avatarColumn = undefined
const columns = [
    {
        name: 'query', header: 'Query Log',
        fn: (row: any) => <div>
            <div className='text-sm text-gray-500'>{(new Date(row.time)).toUTCString()}</div>
            <div className='text-sm font-medium text-gray-900'>{row.query}</div>
            <div className='block whitespace-pre'>{JSON.stringify(Object.fromEntries(row.parameters.map((v:any, i:number) => ['$' + (i + 1), v])), null, 4)}</div>
        </div>
    },
]
const Dashboard: NextPage = () => {
    const [page, setPage] = useState(1)
    const offset = (page - 1) * limit
    const { data, error } = getStats()
    const { rows:all_rows } = data || {}
    const total = all_rows?.length || 0
    const first = offset
    const last = offset + limit - 1
    const rows = all_rows?.slice(first, last + 1) || []
    return (
        <div className="px-4 sm:px-6 lg:px-8 mt-5">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                    <div>Explore the app and see metrics here</div>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    {error && <div>Failed to load</div>}
                    {!data && <div>Loading...</div>}
                </div>
            </div>
            {!error && data &&
                <div className="-mx-4 mt-4 overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:-mx-6 md:mx-0 md:rounded-lg">
                    <Table
                        idColumn={idColumn}
                        avatarColumn={avatarColumn}
                        columns={columns}
                        rows={rows}
                        limit={limit}
                        first={first}
                        last={last}
                        total={total}
                        setPage={setPage}
                    />
                </div>
            }
        </div>
    )
}
export default Dashboard