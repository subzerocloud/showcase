import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid'
interface PaginationProps {
    first: number,
    last: number,
    total: number,
    itemsPerPage: number,
    setPage: (page: number) => void,
}

export default function Pagination(props: PaginationProps) {
    const { first, last, total, itemsPerPage, setPage } = props
    const totalPages = Math.ceil(total / itemsPerPage)
    const currentPage = Math.floor(first / itemsPerPage) + 1

    function setPageWrapped(e: React.MouseEvent, page: number) {
        e.preventDefault()
        if (page < 1) setPage(1)
        else if (page > totalPages) setPage(totalPages)
        else setPage(page)
    }
    return (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
                <a
                    href="#"
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={(e) => setPageWrapped(e, currentPage - 1)}
                >
                    Previous
                </a>
                <a
                    href="#"
                    className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={(e) => setPageWrapped(e, currentPage + 1)}
                >
                    Next
                </a>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{first + 1}</span> to <span className="font-medium">{last + 1}</span> of{' '}
                        <span className="font-medium">{total}</span> results
                    </p>
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <a
                            href="#"
                            className="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20"
                            onClick={(e) => setPageWrapped(e, currentPage - 1)}
                        >
                            <span className="sr-only">Previous</span>
                            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                        </a>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <a key={page}
                            href="#"
                            // className="relative inline-flex items-center border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20"
                                className={`relative inline-flex items-center border  px-4 py-2 text-sm font-medium focus:z-20 ${currentPage === page ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}
                                onClick={(e) => setPageWrapped(e, page)}
                            >
                                {page}
                            </a>
                        ))}
                        
                        {/* Current: "z-10 bg-indigo-50 border-indigo-500 text-indigo-600", Default: "bg-white border-gray-300 text-gray-500 hover:bg-gray-50" */}
                        {/* <a
                            href="#"
                            aria-current="page"
                            className="relative z-10 inline-flex items-center border border-indigo-500 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-600 focus:z-20"
                        >
                            1
                        </a> */}
                        
                        <a
                            href="#"
                            className="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 focus:z-20"
                            onClick={(e) => setPageWrapped(e, currentPage + 1)}
                        >
                            <span className="sr-only">Next</span>
                            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                        </a>
                    </nav>
                </div>
            </div>
        </div>
    )
}
