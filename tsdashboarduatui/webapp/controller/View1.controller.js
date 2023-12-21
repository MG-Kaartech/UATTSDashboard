sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/Token",
    "com/mgc/tsdashboarduatui/model/formatter",
    "com/mgc/tsdashboarduatui/util/XLSX",
    "com/mgc/tsdashboarduatui/util/FullMin",
    "com/mgc/tsdashboarduatui/util/JsZip",
    'sap/m/MessageToast'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, MessageBox, Filter, FilterOperator, Fragment, JSONModel, Token, formatter, XLSXFile, FullMin, JsZip, MessageToast) {
        "use strict";

        return Controller.extend("com.mgc.tsdashboarduatui.controller.View1", {
            formatter: formatter,
            onInit: function () {
                sap.ui.core.BusyIndicator.show(-1);
                var valueHelpModel = new JSONModel();
                valueHelpModel.setSizeLimit(100000);
                var batchPromise = jQuery.Deferred();
                var sfBatchPromise = jQuery.Deferred();
                this.getView().setModel(valueHelpModel, "valueHelp");
                var oModel = this.getOwnerComponent().getModel();
                var oDataModel = new sap.ui.model.odata.ODataModel(oModel.sServiceUrl);
                var batchOperation0 = oDataModel.createBatchOperation("/Employees_prd?$format=json", "GET");
                var batchOperation1 = oDataModel.createBatchOperation("/WbsElement_prd?$format=json", "GET");
                var batchArray = [batchOperation0, batchOperation1];
                oDataModel.addBatchReadOperations(batchArray);
                oDataModel.submitBatch(function (oResult) {
                    try {
                        this.getView().getModel("valueHelp").setProperty("/emp", oResult.__batchResponses[0].data.results);
                    } catch (err) { }
                    try {
                        this.getView().getModel("valueHelp").setProperty("/wbs", oResult.__batchResponses[1].data.results);
                    } catch (err) { }
                    batchPromise.resolve();
                }.bind(this), function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error(this.getResourceBundle().getText("errorBatch"));
                }.bind(this));

                var sfModel = this.getOwnerComponent().getModel("v2");
                var oSFDataModel = new sap.ui.model.odata.ODataModel(sfModel.sServiceUrl);
                var ccBatchOperation = oSFDataModel.createBatchOperation("/FOCompany?$format=json", "GET");
                var coctchOperation = oSFDataModel.createBatchOperation("/FOCostCenter?$format=json", "GET");
                var sfBatchArray = [ccBatchOperation, coctchOperation];
                oSFDataModel.addBatchReadOperations(sfBatchArray);
                oSFDataModel.submitBatch(function (oResult) {
                    try {
                        var company = [];
                        var companyRecords = oResult.__batchResponses[0].data.results;
                        for (var i = 0; i < companyRecords.length; i++) {
                            if (companyRecords[i].externalCode == "6002" || companyRecords[i].externalCode == "2006" || companyRecords[i].externalCode == "2002") {
                                company.push(companyRecords[i]);
                            }
                        }
                        this.getView().getModel("valueHelp").setProperty("/company", company);
                    } catch (err) { }
                    try {
                        this.getView().getModel("valueHelp").setProperty("/costcenter", oResult.__batchResponses[1].data.results);
                    } catch (err) { }
                    sfBatchPromise.resolve();
                    //sap.ui.core.BusyIndicator.hide();
                }.bind(this), function (oError) {
                    sap.ui.core.BusyIndicator.hide();
                    MessageBox.error(this.getResourceBundle().getText("errorSFBatch"));
                }.bind(this));
                // hide busy indicator after batch callls by using promise
                $.when(batchPromise, sfBatchPromise).done(
                    function () {
                        sap.ui.core.BusyIndicator.hide();
                    });
            },
            onCompanyF4: function () {
                if (!this.CompanyF4Help) {
                    Fragment.load({
                        name: "com.mgc.tsdashboarduatui.fragment.CompanyF4Help",
                        controller: this
                    }).then(function (oDialog) {
                        this.CompanyF4Help = oDialog;
                        this.getView().addDependent(oDialog);
                        this.CompanyF4Help.open();
                    }.bind(this));
                } else {
                    this.CompanyF4Help.open();
                }
            },
            oCompanyF4HelpCancel: function () {
                this.CompanyF4Help.close();
            },
            onCostCenerF4: function () {
                if (!this.CostCenterF4Help) {
                    Fragment.load({
                        name: "com.mgc.tsdashboarduatui.fragment.CostCenterF4Help",
                        controller: this
                    }).then(function (oDialog) {
                        this.CostCenterF4Help = oDialog;
                        this.getView().addDependent(oDialog);
                        this.CostCenterF4Help.open();
                    }.bind(this));
                } else {
                    this.CostCenterF4Help.open();
                }
            },
            oCostCenterF4HelpCancel: function () {
                this.CostCenterF4Help.close();
            },
            // filter cost center
            onSearchCostCenter: function (oEvent) {
                var sQuery = oEvent.getSource().getValue();
                var ID = new sap.ui.model.Filter("costcenterExternalObjectID", sap.ui.model.FilterOperator.Contains, sQuery);
                var Name = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery);
                var Description = new sap.ui.model.Filter("description", sap.ui.model.FilterOperator.Contains, sQuery);
                var filters = new sap.ui.model.Filter([ID, Name, Description]);
                var listassign = sap.ui.getCore().byId("idCostCenterTimeSheetTable");
                listassign.getBinding("items").filter(filters, "Appliation");
            },
            // costcenter selection
            onSelectCostCenter: function (oEvent) {
                var sSelectedPath = oEvent.getSource().getBindingContextPath();
                var sObj = this.getView().getModel("valueHelp").getProperty(sSelectedPath);
                this.getView().byId("costCenterTimeSheet").setValue(sObj.costcenterExternalObjectID);
                this.oCostCenterF4HelpCancel();
            },
            onWBSF4: function () {
                if (!this.onWBSF4Help) {
                    Fragment.load({
                        name: "com.mgc.tsdashboarduatui.fragment.WBSF4Help",
                        controller: this
                    }).then(function (oDialog) {
                        this.onWBSF4Help = oDialog;
                        this.getView().addDependent(oDialog);
                        this.onWBSF4Help.open();
                    }.bind(this));
                } else {
                    this.onWBSF4Help.open();
                }
            },
            // filter company
            onSearchCompany: function (oEvent) {
                var sQuery = oEvent.getSource().getValue();
                var externalCode = new sap.ui.model.Filter("externalCode", sap.ui.model.FilterOperator.Contains, sQuery);
                var name = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sQuery);
                var country = new sap.ui.model.Filter("country", sap.ui.model.FilterOperator.Contains, sQuery);
                var filters = new sap.ui.model.Filter([externalCode, name, country]);
                var listassign = sap.ui.getCore().byId("idCompanyTimesheetTable");
                listassign.getBinding("items").filter(filters, "Appliation");
            },
            onSearchWBSValue: function (oEvent) {
                var sQuery = oEvent.getParameter("value");
                var ID = new sap.ui.model.Filter("ID", sap.ui.model.FilterOperator.Contains, sQuery);
                var NAME = new sap.ui.model.Filter("NAME", sap.ui.model.FilterOperator.Contains, sQuery);
                var ID_1 = new sap.ui.model.Filter("ID_1", sap.ui.model.FilterOperator.Contains, sQuery);
                var NAME_1 = new sap.ui.model.Filter("NAME_1", sap.ui.model.FilterOperator.Contains, sQuery);
                var ID_2 = new sap.ui.model.Filter("ID_2", sap.ui.model.FilterOperator.Contains, sQuery);
                var NAME_2 = new sap.ui.model.Filter("NAME_2", sap.ui.model.FilterOperator.Contains, sQuery);
                var COMPANYID = new sap.ui.model.Filter("COMPANYID", sap.ui.model.FilterOperator.Contains, sQuery);
                var PROJECTMANAGEREMAIL_2 = new sap.ui.model.Filter("PROJECTMANAGEREMAIL_2", sap.ui.model.FilterOperator.Contains, sQuery);
                var PROJECTMANAGER_2 = new sap.ui.model.Filter("PROJECTMANAGER_2", sap.ui.model.FilterOperator.Contains, sQuery);
                var filters = new sap.ui.model.Filter([ID, NAME, ID_1, NAME_1, ID_2, NAME_2, COMPANYID, PROJECTMANAGEREMAIL_2, PROJECTMANAGER_2]);
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter(filters, "Appliation");
            },
            // resource company
            onSelectCompany: function (oEvent) {
                var oSelectedPath = oEvent.getSource().getBindingContextPath();
                var oObj = this.getView().getModel("valueHelp").getProperty(oSelectedPath);
                this.CompanyCode = oObj.externalCode;
                this.getView().byId("companyTimeSheet").setValue(oObj.name);
                this.oCompanyF4HelpCancel();
            },
            getResourceBundle: function () {
                var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                return oResourceBundle;
            },
            handleWBSClose: function (oEvent) {
                if (oEvent.getParameter("selectedContexts") == undefined) {
                    return;
                }
                var oSelectedPath = oEvent.getParameter("selectedContexts")[0].getPath();
                var oObj = this.getView().getModel("valueHelp").getProperty(oSelectedPath);
                this.getView().byId("wbsTimeSheet").setValue(oObj.ID + "/" + oObj.ID_1 + "/" + oObj.ID_2);
            },
            onChangeF4Help: function (oEvent) {
                oEvent.getSource().setValue("");
                MessageToast.show(this.getResourceBundle().getText("selectF4"));
            },
            onSearch: function () {
                const stdate = this.getView().byId("idStDate").getDateValue();
                const fndate = this.getView().byId("idFnDate").getDateValue();
                const resInput = this.getView().byId("resInput").getTokens();
                if (stdate == null || fndate == null) {
                    MessageBox.error(this.getResourceBundle().getText("errorMandatory"));
                    return;
                }
                const diffTime = Math.abs(stdate - fndate);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 7) {
                    MessageBox.error(this.getResourceBundle().getText("errorMax"));
                    return;
                }
                var oFilterValues = [];
                this.getView().byId("timesheetSheetDashboard").setBusy(true);
                var wbs = this.getView().byId("wbsTimeSheet").getValue();
                if (wbs !== "") {
                    var val = wbs.split("/");
                    var Job = new sap.ui.model.Filter({
                        path: "Job",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: val[0]
                    });
                    oFilterValues.push(Job);
                    var Section = new sap.ui.model.Filter({
                        path: "Section",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: val[1]
                    });
                    oFilterValues.push(Section);
                    var Phase = new sap.ui.model.Filter({
                        path: "Phase",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: val[2]
                    });
                    oFilterValues.push(Phase);
                }
                var costcenter = this.getView().byId("costCenterTimeSheet").getValue();
                if (costcenter !== "") {
                    var CostCenter = new sap.ui.model.Filter({
                        path: "CostCenter",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: costcenter
                    });
                    oFilterValues.push(CostCenter);
                }
                /// Filters for Service call
                // Date Selection
                var DateRange = new sap.ui.model.Filter({
                    path: "Date",
                    operator: sap.ui.model.FilterOperator.BT,
                    value1: this.getView().byId("idStDate").getValue(),
                    value2: this.getView().byId("idFnDate").getValue()
                });
                oFilterValues.push(DateRange);
                // Resource Selection Selection
                for (let i = 0; i < resInput.length; i++) {
                    var oResource = new sap.ui.model.Filter({
                        path: "EmployeeID",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: resInput[i].getText()
                    });
                    oFilterValues.push(oResource);
                }
                var compnayCode = this.getView().byId("companyTimeSheet").getValue();
                if (compnayCode !== "") {
                    var CompanyCode = new sap.ui.model.Filter({
                        path: "CompanyID",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: this.CompanyCode
                    });
                    oFilterValues.push(CompanyCode);
                }
                this.getOwnerComponent().getModel().read("/TimeSheetDetails_prd", {
                    filters: oFilterValues,
                    urlParameters: { "$select": "Date,EmployeeID,EmployeeName,CompanyID,TotalHours,SaveSubmitStatus" },
                    sorters: [
                        new sap.ui.model.Sorter("Date", /*descending*/false) // "Sorter" required from "sap/ui/model/Sorter"
                    ],
                    success: function (odata) {
                        if (odata.results.length == 0) {
                            MessageBox.information(this.getResourceBundle().getText("infoData"));
                            this.getView().byId("timesheetSheetDashboard").setBusy(false);
                            return;
                        }
                        else {

                            let unique1 = [...new Set(odata.results.map(item => item.EmployeeID))];
                            let unique2 = [...new Set(odata.results.map(item => item.Date))];
                            this.arrangeData(odata.results, unique1, unique2);
                        }
                        let unique = [...new Set(odata.results.map(item => item.Date))];
                        this.arrangeColData(unique);
                        this.getView().byId("timesheetSheetDashboard").setBusy(false);
                    }.bind(this),
                    error: function (oError) {
                        MessageBox.error(this.getResourceBundle().getText("errorTimesheet"));
                    }.bind(this)
                });
            },
            arrangeColData: function (unique) {
                var that = this;
                const dates = [];
                for (var i = 0; i < unique.length; i++) {
                    var obj = {};
                    obj.date = unique[i];
                    dates.push(obj);
                }
                dates.unshift({ "date": "Employee Name" })
                dates.unshift({ "date": "Employee ID" })
                that.getView().getModel("valueHelp").setProperty("/Columns", dates);
            },
            handleValueHelp: function (oEvent) {
                var sInputValue = oEvent.getSource().getValue(),
                    oView = this.getView();

                // create value help dialog
                if (!this._pValueHelpDialog) {
                    this._pValueHelpDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.mgc.tsdashboarduatui.fragment.ResourcesF4Help",
                        controller: this
                    }).then(function (oValueHelpDialog) {
                        oView.addDependent(oValueHelpDialog);
                        return oValueHelpDialog;
                    });
                }
                this._pValueHelpDialog.then(function (oValueHelpDialog) {
                    // create a filter for the binding
                    oValueHelpDialog.getBinding("items").filter([new Filter(
                        "FirstName",
                        FilterOperator.Contains,
                        sInputValue
                    )]);
                    // open value help dialog filtered by the input value
                    oValueHelpDialog.open(sInputValue);
                });
            },
            arrangeData: function (oData, unique1, unique2) {
                var finalArray = [];
                for (var i = 0; i < unique1.length; i++) {
                    var obj = {};
                    for (var j = 0; j < unique2.length; j++) {
                        obj.EmployeeID = unique1[i];
                        var TotalHours = 0;
                        var Status = "";
                        for (var k = 0; k < oData.length; k++) {
                            if (oData[k].EmployeeID == unique1[i] && oData[k].Date == unique2[j]) {
                                if (j == 0) {
                                    Status = Status + "#" + oData[k].SaveSubmitStatus;
                                    obj.status1 = Status;
                                    TotalHours += Number(oData[k].TotalHours);
                                    obj.hours1 = TotalHours;
                                    obj.EmployeeName = oData[k].EmployeeName;
                                    obj.Date1 = oData[k].Date;
                                }
                                else if (j == 1) {
                                    Status = Status + "#" + oData[k].SaveSubmitStatus;
                                    obj.status2 = Status;
                                    TotalHours += Number(oData[k].TotalHours);
                                    obj.hours2 = TotalHours;
                                    obj.EmployeeName = oData[k].EmployeeName;
                                    obj.Date2 = oData[k].Date;
                                }
                                else if (j == 2) {
                                    Status = Status + "#" + oData[k].SaveSubmitStatus;
                                    obj.status3 = Status;
                                    TotalHours += Number(oData[k].TotalHours);
                                    obj.hours3 = TotalHours;
                                    obj.EmployeeName = oData[k].EmployeeName;
                                    obj.Date3 = oData[k].Date;
                                }
                                else if (j == 3) {
                                    //obj.status4 = oData[k].SaveSubmitStatus;
                                    Status = Status + "#" + oData[k].SaveSubmitStatus;
                                    obj.status4 = Status;
                                    TotalHours += Number(oData[k].TotalHours);
                                    obj.hours4 = TotalHours;
                                    obj.EmployeeName = oData[k].EmployeeName;
                                    obj.Date4 = oData[k].Date;
                                }
                                else if (j == 4) {
                                    //obj.status5 = oData[k].SaveSubmitStatus;
                                    Status = Status + "#" + oData[k].SaveSubmitStatus;
                                    obj.status5 = Status;
                                    TotalHours += Number(oData[k].TotalHours);
                                    obj.hours5 = TotalHours;
                                    obj.EmployeeName = oData[k].EmployeeName;
                                    obj.Date5 = oData[k].Date;
                                }
                                else if (j == 5) {
                                    //obj.status6 = oData[k].SaveSubmitStatus;
                                    Status = Status + "#" + oData[k].SaveSubmitStatus;
                                    obj.status6 = Status;
                                    TotalHours += Number(oData[k].TotalHours);
                                    obj.hours6 = TotalHours;
                                    obj.EmployeeName = oData[k].EmployeeName;
                                    obj.Date6 = oData[k].Date;
                                }
                                else if (j == 6) {
                                    //obj.status7 = oData[k].SaveSubmitStatus;
                                    Status = Status + "#" + oData[k].SaveSubmitStatus;
                                    obj.status7 = Status;
                                    TotalHours += Number(oData[k].TotalHours);
                                    obj.hours7 = TotalHours;
                                    obj.EmployeeName = oData[k].EmployeeName;
                                    obj.Date7 = oData[k].Date;
                                }
                            }
                        }
                    }
                    finalArray.push(obj);
                }
                this.getView().getModel("valueHelp").setProperty("/Rows", finalArray);
                this.getView().getModel("valueHelp").refresh();
            },
            _handleValueHelpSearch: function (evt) {
                var sValue = evt.getParameter("value");
                var FirstName = new Filter(
                    "FirstName",
                    FilterOperator.Contains,
                    sValue
                );
                var LastName = new Filter(
                    "LastName",
                    FilterOperator.Contains,
                    sValue
                );
                var EmployeeID = new Filter(
                    "ID",
                    FilterOperator.Contains,
                    sValue
                );
                var filters = new sap.ui.model.Filter([FirstName, LastName, EmployeeID]);
                evt.getSource().getBinding("items").filter(filters, "Appliation");
            },
            _handleValueHelpClose: function (evt) {
                var aSelectedItems = evt.getParameter("selectedItems"),
                    oMultiInput = this.byId("resInput"),
                    tokens = oMultiInput.getTokens();
                if (aSelectedItems && aSelectedItems.length > 0) {
                    aSelectedItems.forEach(function (oItem) {
                        for (var i = 0; i < tokens.length; i++) {
                            if (tokens[i].getText() == oItem.getDescription()) {
                                return;
                            }
                        }
                        oMultiInput.addToken(new Token({
                            text: oItem.getDescription()
                        }));
                    });
                }
            },
            onHoursSelection: function (oEvent) {
                var SelectedPath = oEvent.getSource().getParent().getBindingContextPath();
                var oObj = this.getView().getModel("valueHelp").getProperty(SelectedPath);
                var Hours = Number(oEvent.getSource().getTitle());
                if(Hours == 0){
                    MessageToast.show(this.getResourceBundle().getText("noData"))
                    return;
                }
                sap.ui.core.BusyIndicator.show(-1);
                if (Hours == oObj.hours1) {
                    var Date = oObj.Date1;
                }
                else if (Hours == oObj.hours2) {
                    Date = oObj.Date2;
                }
                else if (Hours == oObj.hours3) {
                    Date = oObj.Date3;
                }
                else if (Hours == oObj.hours4) {
                    Date = oObj.Date4;
                }
                else if (Hours == oObj.hours5) {
                    Date = oObj.Date5;
                }
                else if (Hours == oObj.hours6) {
                    Date = oObj.Date6;
                }
                else if (Hours == oObj.hours7) {
                    Date = oObj.Date7;
                }
                var oFilterValues = [];
                /// Filters for Service call
                // Date Selection
                var DateFilter = new sap.ui.model.Filter({
                    path: "Date",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: Date
                });
                oFilterValues.push(DateFilter);
                // Resource Selection Selection
                var oResource = new sap.ui.model.Filter({
                    path: "EmployeeID",
                    operator: sap.ui.model.FilterOperator.EQ,
                    value1: oObj.EmployeeID
                });
                oFilterValues.push(oResource);
                this.getOwnerComponent().getModel().read("/TimeSheetDetails_prd", {
                    filters: oFilterValues,
                    urlParameters: { "$select": "Date,AppName,EmployeeID,EmployeeName,CompanyID,PayCode,CostCenter,Activity,WorkOrder,Job,Section,Phase,ManagerApprovalName,PayrollApprovalName,TotalHours,SaveSubmitStatus,PayrollApprovalStatus" },
                    sorters: [
                        new sap.ui.model.Sorter("Date", /*descending*/false)
                    ],
                    success: function (odata) {
                        if (odata.results.length == 0) {
                            MessageBox.information(this.getResourceBundle().getText("infoData"));
                            return;
                        }
                        else {
                            this.getView().getModel("valueHelp").setProperty("/timePeriod", odata.results);
                            this.openTimesheetDetail(Hours);
                        }
                    }.bind(this),
                    error: function (oError) {
                        sap.ui.core.BusyIndicator.hide();
                        MessageBox.error(this.getResourceBundle().getText("errorTimesheet"));
                    }.bind(this)
                });
            },
            openTimesheetDetail: function (Hours) {
                if (!this.onTimePeriod) {
                    Fragment.load({
                        name: "com.mgc.tsdashboarduatui.fragment.TimePeriod",
                        controller: this
                    }).then(function (oDialog) {
                        this.onTimePeriod = oDialog;
                        this.getView().addDependent(oDialog);
                        this.onTimePeriod.open();
                        sap.ui.getCore().byId("idTimesheetTotalValues").setNumber(Hours);
                        sap.ui.core.BusyIndicator.hide();
                    }.bind(this));
                } else {
                    this.onTimePeriod.open();
                    sap.ui.getCore().byId("idTimesheetTotalValues").setNumber(Hours);
                    sap.ui.core.BusyIndicator.hide();
                }
            },
            timeSheetDialogCancel: function () {
                this.onTimePeriod.close();
            },
            exportTimeData: function () {
                var rows = [];
                var fileName = "TimesheetStatusDashboard.xlsx";
                var Columns = this.getView().getModel("valueHelp").getData().Columns;
                var aa = Object.assign({}, Columns);
                var selectedRow = this.getView().byId("timesheetSheetDashboard").getItems();
                for (var i = 0; i < selectedRow.length; i++) {
                    var obj = {};
                    var path = selectedRow[i].getBindingContextPath();
                    var data = this.getView().getModel("valueHelp").getProperty(path);
                    if (data.EmployeeID !== "") {
                        obj[aa[0].date] = data.EmployeeID;
                        obj[aa[1].date] = data.EmployeeName;
                        try {
                            obj[aa[2].date] = this.SaveSubmitStatusText(data.status1);
                            obj.Hours1 = this.HoursValue(data.hours1);
                        } catch (err) { }
                        try {
                            obj[aa[3].date] = this.SaveSubmitStatusText(data.status2);
                            obj.Hours2 = this.HoursValue(data.hours2);
                        } catch (err) { }
                        try {
                            obj[aa[4].date] = this.SaveSubmitStatusText(data.status3);
                            obj.Hours3 = this.HoursValue(data.hours3);
                        } catch (err) { }
                        try {
                            obj[aa[5].date] = this.SaveSubmitStatusText(data.status4);
                            obj.Hours4 = this.HoursValue(data.hours4);
                        } catch (err) { }
                        try {
                            obj[aa[6].date] = this.SaveSubmitStatusText(data.status5);
                            obj.Hours5 = this.HoursValue(data.hours5);
                        } catch (err) { }
                        try {
                            obj[aa[7].date] = this.SaveSubmitStatusText(data.status6);
                            obj.Hours6 = this.HoursValue(data.hours6);
                        } catch (err) { }
                        try {
                            obj[aa[8].date] = this.SaveSubmitStatusText(data.status7);
                            obj.Hours7 = this.HoursValue(data.hours7);
                        } catch (err) { }
                        rows.push(obj);
                    }
                }
                var workbook = XLSX.utils.book_new();
                var worksheet = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(workbook, worksheet, "TimesheetStatusDashboard");
                XLSX.writeFile(workbook, fileName, { compression: true });
            },
            SaveSubmitStatusText: function (status) {
                var count = 0;
                if (status == null || status == "" || status == undefined) {
                    return "Open";
                }
                else {
                    status.split("#").forEach(index => {
                        if (index !== "" && index != 'Approved') {
                            count++;
                        }
                    })
                }
                if (count == 0) {
                    return "Approved";
                } else {
                    return "Inprogress";
                }
            },
            HoursValue: function (val) {
                if (val == null || val == undefined || val == "") {
                    return 0;
                }
                else {
                    return val;
                }
            }
        });
    });

