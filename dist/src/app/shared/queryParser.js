const RESERVED_QUERY_KEYS = new Set([
    'page',
    'limit',
    'sortBy',
    'sortOrder',
    'search',
    'searchTerm',
]);
const getStringValue = (value) => {
    if (typeof value === 'string') {
        const trimmedValue = value.trim();
        return trimmedValue.length > 0 ? trimmedValue : undefined;
    }
    if (Array.isArray(value)) {
        const firstValue = value[0];
        return typeof firstValue === 'string' ? getStringValue(firstValue) : undefined;
    }
    return undefined;
};
const toPositiveInteger = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    const rounded = Math.floor(parsed);
    return rounded > 0 ? rounded : fallback;
};
export const parsePaginationQuery = (query, config) => {
    const defaultPage = config.defaultPage ?? 1;
    const defaultLimit = config.defaultLimit ?? 10;
    const maxLimit = config.maxLimit ?? 50;
    const page = toPositiveInteger(getStringValue(query.page), defaultPage);
    const limit = Math.min(toPositiveInteger(getStringValue(query.limit), defaultLimit), maxLimit);
    const requestedSortBy = getStringValue(query.sortBy);
    const sortBy = requestedSortBy && config.allowedSortBy.includes(requestedSortBy)
        ? requestedSortBy
        : config.defaultSortBy ?? config.allowedSortBy[0];
    const requestedSortOrder = getStringValue(query.sortOrder);
    const sortOrder = requestedSortOrder === 'asc' || requestedSortOrder === 'desc'
        ? requestedSortOrder
        : config.defaultSortOrder ?? 'desc';
    const searchTerm = getStringValue(query.searchTerm) || getStringValue(query.search);
    const filterWhitelist = new Set(config.allowedFilterKeys || []);
    const filters = {};
    Object.entries(query).forEach(([key, value]) => {
        if (RESERVED_QUERY_KEYS.has(key)) {
            return;
        }
        if (filterWhitelist.size > 0 && !filterWhitelist.has(key)) {
            return;
        }
        const stringValue = getStringValue(value);
        if (!stringValue) {
            return;
        }
        filters[key] = stringValue;
    });
    return {
        page,
        limit,
        skip: (page - 1) * limit,
        sortBy,
        sortOrder,
        searchTerm,
        filters,
    };
};
export const buildPaginationMeta = (page, limit, total) => ({
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
});
