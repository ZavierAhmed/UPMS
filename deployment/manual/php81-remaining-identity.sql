-- Only the remaining identity/transport metadata; no business records or repeated 20-table inventory.
SELECT DATABASE() AS selected_schema,CURRENT_USER() AS authenticated_account,
       @@hostname AS database_hostname,@@socket AS advertised_socket,@@server_id AS server_id,
       VERSION() AS exact_server_version;
-- This advertised path alone does NOT prove PHP uses the socket.
