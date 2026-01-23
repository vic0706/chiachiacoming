
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Team-ID",
    };

    // 處理預檢請求
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ---------------------------------------------------------
      // 【SRE 工具】環境與版本診斷
      // ---------------------------------------------------------
      if (path.includes("debug-auth")) {
        return Response.json({
          status: "Worker Active (v1.3.3 - Fix Delete)",
          db_bound: !!env.runbike,
          kv_bound: !!env.CHIACHIACOMING_KV,
          config: "Supabase Storage Ready"
        }, { headers: corsHeaders });
      }

      // ==========================================
      // A. 身分驗證區塊 (Authentication)
      // ==========================================
      
      // A-1. 產生訪客 OTP
      if (path.includes("generate-otp") && method === "POST") {
        const formData = await request.formData();
        if (formData.get("admin_password") !== env.ADMIN_PASSWORD) {
          return Response.json({ error: "管理密碼錯誤" }, { status: 403, headers: corsHeaders });
        }
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        await env.CHIACHIACOMING_KV.put("GUEST_OTP", otp, { expirationTtl: 10800 });
        return Response.json({ success: true, otp: otp }, { headers: corsHeaders });
      }

      // A-2. 驗證訪客 OTP
      if (path.includes("verify-otp") && method === "POST") {
        const formData = await request.formData();
        const validOtp = await env.CHIACHIACOMING_KV.get("GUEST_OTP");
        return (validOtp && formData.get("otp") === validOtp) ? 
          Response.json({ success: true }, { headers: corsHeaders }) : 
          Response.json({ error: "無效的密碼或已過期" }, { status: 401, headers: corsHeaders });
      }

      // A-3. 隊員登入
      if (path === "/login" && method === "POST") {
        const { id, password, team_id } = await request.json();
        if (!team_id || !id) return Response.json({ success: false, msg: "缺少參數" }, { status: 400, headers: corsHeaders });
        
        const person = await env.runbike.prepare(`
          SELECT P.id, P.name, P.is_retired, P.team_id, P.myword, P.s_url, P.b_url, T.team_name, T.team_en_name
          FROM People P JOIN Teams T ON P.team_id = T.id
          WHERE P.id = ? AND P.password = ? AND P.team_id = ?
        `).bind(id, password, team_id).first();

        return person ? Response.json({ success: true, user: person }, { headers: corsHeaders }) : 
                        Response.json({ success: false, msg: "登入失敗：帳號密碼或車隊錯誤" }, { status: 401, headers: corsHeaders });
      }

      // ==========================================
      // B. 資料讀取區塊 (GET)
      // ==========================================
      if (method === "GET") {
        const teamId = url.searchParams.get("team_id");
        let query = "";
        let params = [];

        const isSensitive = path.includes("/training-records") || path.includes("/people") || 
                            path.includes("/race-records") || path.includes("/race-events");
        if (isSensitive && !teamId) return Response.json({ error: "Missing team_id" }, { status: 400, headers: corsHeaders });

        if (path.includes("/people")) {
          query = "SELECT id, name, birthday, is_retired, myword, s_url, b_url FROM People WHERE team_id = ? ORDER BY is_retired ASC, name ASC";
          params = [teamId];
        } else if (path.includes("/race-events")) {
          query = `
            SELECT RE.*, RS.series_name, (SELECT COUNT(*) FROM RaceRecords WHERE event_id = RE.id) as participant_count 
            FROM RaceEvents RE JOIN RaceSeries RS ON RE.series_id = RS.id 
            WHERE RE.team_id = ? ORDER BY RE.date DESC`;
          params = [teamId];
        } else if (path.includes("/race-records")) {
          query = `
            SELECT RR.*, P.name as person_name, RE.date, RE.name AS race_name, RE.location, RE.id as event_id, RS.series_name, 
            COALESCE(RR.personal_url, RE.public_url) AS display_url,
            CASE WHEN RR.personal_url IS NOT NULL THEN 1 ELSE 0 END AS has_personal_photo
            FROM RaceRecords RR 
            JOIN RaceEvents RE ON RR.event_id = RE.id 
            JOIN RaceSeries RS ON RE.series_id = RS.id 
            JOIN People P ON RR.people_id = P.id
            WHERE RR.team_id = ? ORDER BY RE.date DESC, RR.id DESC`;
          params = [teamId];
        } else if (path.includes("/race-series")) {
          query = "SELECT * FROM RaceSeries ORDER BY series_name ASC";
        } else if (path.includes("/training-records")) {
          query = `
            SELECT T.*, P.name, Ty.type_name 
            FROM TrainingRecords T 
            JOIN People P ON T.people_id = P.id 
            JOIN TrainingTypes Ty ON T.training_type_id = Ty.id 
            WHERE T.team_id = ? AND P.is_retired = 0 
            ORDER BY T.date DESC, T.created_at DESC`;
          params = [teamId];
        } else if (path.includes("/training-types")) {
          query = "SELECT * FROM TrainingTypes ORDER BY is_default DESC, type_name ASC";
        } else if (path.includes("/team-info")) {
          query = "SELECT id, team_name, team_en_name, team_code FROM Teams WHERE id = ?";
          params = [teamId];
        }

        if (query) {
          const { results } = params.length ? await env.runbike.prepare(query).bind(...params).all() : await env.runbike.prepare(query).all();
          return Response.json(results || [], { headers: corsHeaders });
        }
      }

      // ==========================================
      // C. 寫入/更新/刪除區塊 (POST/PUT/DELETE)
      // ==========================================
      if (method === "POST") {
        let data = {};
        let realMethod = "POST";
        const contentType = request.headers.get("content-type") || "";
        
        if (contentType.includes("application/json")) {
            data = await request.json();
            realMethod = data._method || "POST";
        } else {
            const formData = await request.formData();
            data = Object.fromEntries(formData);
            realMethod = data._method || "POST";
        }

        // Robust ID extraction
        // Example: /api/training-records/123 -> parts: ['', 'api', 'training-records', '123'] -> id: 123
        const parts = path.split('/').filter(p => p && p !== 'api');
        const id = parts.pop();
        const teamId = data.team_id;
        
        if (!teamId) return Response.json({ error: "Missing team_id in payload" }, { status: 400, headers: corsHeaders });

        // C-1. 刪除邏輯
        if (realMethod === "DELETE") {
          let table = null;
          if (path.includes("/people")) table = "People";
          else if (path.includes("/training-records")) table = "TrainingRecords";
          else if (path.includes("/race-records")) table = "RaceRecords";
          else if (path.includes("/race-events")) table = "RaceEvents";
          
          if (table && id) {
            await env.runbike.prepare(`DELETE FROM ${table} WHERE id = ? AND team_id = ?`).bind(id, teamId).run();
            return Response.json({ success: true }, { headers: corsHeaders });
          } else {
             return Response.json({ error: "Invalid delete target" }, { status: 400, headers: corsHeaders });
          }
        }

        // C-2. 更新邏輯 (PUT)
        if (realMethod === "PUT") {
          if (path.includes("/people")) {
            const isRetired = (data.is_retired === true || data.is_retired === 1 || data.is_retired === "1") ? 1 : 0;
            await env.runbike.prepare(`UPDATE People SET name=?, birthday=?, is_retired=?, myword=?, s_url=?, b_url=?, password=COALESCE(?, password) WHERE id=? AND team_id=?`)
              .bind(data.name, data.birthday, isRetired, data.myword, data.s_url || "", data.b_url || "", data.password || null, id, teamId).run();
          } else if (path.includes("/race-events")) {
            if (!data.series_id) return Response.json({ error: "更新失敗：請選擇賽事系列" }, { status: 400, headers: corsHeaders });
            await env.runbike.prepare(`UPDATE RaceEvents SET date=?, name=?, location=?, public_url=?, series_id=? WHERE id=? AND team_id=?`)
              .bind(data.date, data.name, data.location, data.public_url || "", data.series_id, id, teamId).run();
          } else if (path.includes("/race-records")) {
            await env.runbike.prepare(`UPDATE RaceRecords SET score=?, note=?, personal_url=? WHERE id=? AND team_id=?`)
              .bind(data.score, data.note, data.personal_url || "", id, teamId).run();
          } else if (path.includes("/training-records")) {
            await env.runbike.prepare(`UPDATE TrainingRecords SET score=?, date=? WHERE id=? AND team_id=?`)
              .bind(data.score, data.date, id, teamId).run();
          }
          return Response.json({ success: true }, { headers: corsHeaders });
        }

        // C-3. 新增邏輯 (POST)
        if (realMethod === "POST") {
          if (path.includes("/people")) {
            await env.runbike.prepare(`INSERT INTO People (team_id, password, name, birthday, is_retired, myword, s_url, b_url) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`)
              .bind(teamId, data.password || "123456", data.name, data.birthday, data.myword || "", data.s_url || "", data.b_url || "").run();
          } else if (path.includes("/training-records")) {
            await env.runbike.prepare(`INSERT INTO TrainingRecords (date, people_id, training_type_id, score, team_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
              .bind(data.date, data.people_id, data.training_type_id, data.score, teamId).run();
          } else if (path.includes("/race-events")) {
            if (!data.series_id) return Response.json({ error: "操作失敗：請選擇賽事系列" }, { status: 400, headers: corsHeaders });
            await env.runbike.prepare(`INSERT INTO RaceEvents (team_id, series_id, date, name, location, public_url) VALUES (?, ?, ?, ?, ?, ?)`)
              .bind(teamId, data.series_id, data.date, data.name, data.location || "", data.public_url || "").run();
          } else if (path.includes("/race-records")) {
            if (!data.event_id) return Response.json({ error: "請選擇一個要參加的賽事" }, { status: 400, headers: corsHeaders });
            await env.runbike.prepare(`INSERT INTO RaceRecords (team_id, people_id, event_id, score, note, personal_url) VALUES (?, ?, ?, ?, ?, ?)`)
              .bind(teamId, data.people_id, data.event_id, data.score || "", data.note || "", data.personal_url || "").run();
          }
          return Response.json({ success: true }, { status: 201, headers: corsHeaders });
        }
      }

      if (env.ASSETS) return env.ASSETS.fetch(request);
      return new Response("Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
          return Response.json({ error: "資料重複，請檢查是否已存在" }, { status: 409, headers: corsHeaders });
      }
      return Response.json({ error: `系統錯誤: ${err.message}` }, { status: 500, headers: corsHeaders });
    }
  }
}
