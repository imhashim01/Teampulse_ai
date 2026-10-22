import dns from "dns";

// Some Windows/network setups make Node's resolver refuse SRV lookups (querySrv ECONNREFUSED)
// even though the OS resolver works. If the mongodb+srv lookup fails, fall back to public DNS.
export const ensureMongoDns = async (uri = process.env.MONGO_URI) => {
    const match = /^mongodb\+srv:\/\/(?:[^@]+@)?([^/?]+)/.exec(uri || "");
    if (!match) return;
    try {
        await dns.promises.resolveSrv(`_mongodb._tcp.${match[1]}`);
    } catch {
        dns.setServers(["8.8.8.8", "1.1.1.1"]);
    }
};
