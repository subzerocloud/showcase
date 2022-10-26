import Pagination from '../components/pagination'
interface sProps {
    idColumn: string
    avatarColumn?: string
    columns: { name: string, header:string, fn?: (item: any) => string | JSX.Element }[]
    rows: any
    limit: number
    first: number
    last: number
    total: number
    
    setPage: (page: number) => void
}

export default function Table(props: sProps)  {
    
    const { idColumn, avatarColumn, columns, rows, limit, first, last, total, setPage } = props

    return (
        <>
            <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                    <tr>
                        {avatarColumn && <th scope="col" className={`py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6` }></th>}
                    {columns.map((column: any) => (
                        <th key={column.name} scope="col" className={`py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 ${column.th_style || ''}` }>
                            {column.header}
                        </th>
                    ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                    {rows.map((row:any) => (
                        <tr key={row[idColumn]}>
                            {avatarColumn && <td className={`w-full max-w-0 py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6`}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img className="h-6 w-6 rounded-full" src={`https://avatars.dicebear.com/v2/initials/${row[avatarColumn].replace(' ', '-')}.svg`} alt="" />
                            </td>}
                            {columns.map((column: any) => (
                                <td key={column.name} className={`w-full max-w-0 py-2 pl-4 pr-3 text-sm font-medium text-gray-900 sm:w-auto sm:max-w-none sm:pl-6 ${column.td_style || ''}`}>
                                    {column.fn ? column.fn(row) : row[column.name]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <Pagination first={first} last={last} total={total} itemsPerPage={limit} setPage={setPage} />
        </>
    )
}