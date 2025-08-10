// Returns a stable per-tab client id for associating AI context
let _cid = null;
export function getClientId() {
  if (_cid) return _cid;
  try {
    const key = 'interviewly_client_id';
    _cid = sessionStorage.getItem(key);
    if (!_cid) {
      _cid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(key, _cid);
    }
    return _cid;
  } catch (_e) {
    _cid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return _cid;
  }
}
