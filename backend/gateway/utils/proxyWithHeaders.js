import proxy from "express-http-proxy";

export const applyProxyWithHeaders = (path) => {
    return proxy(path, {
        limit: "50mb",
        timeout: 120000,
        proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
            if (srcReq.user) {
                proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
            }
            return proxyReqOpts;
        }
    });
};