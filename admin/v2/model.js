// Engineering-owned authoritative read model. No demo fixtures or mutations.
window.AdminModel={validate(value){if(value?.schemaVersion!==1||value.readOnly!==true||!Array.isArray(value.cards)||!Array.isArray(value.residents?.items)||!Array.isArray(value.audit?.items))throw Error('服务端管理数据格式不兼容');return value;}};
