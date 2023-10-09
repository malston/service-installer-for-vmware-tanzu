/*
 * Copyright 2021 VMware, Inc
 * SPDX-License-Identifier: BSD-2-Clause
 */
/**
 * Angular Modules
 */
import { Component, OnInit, Input } from '@angular/core';
import {
    Validators,
    FormControl
} from '@angular/forms';
import { Netmask } from 'netmask';

/**
 * App imports
 */
import { PROVIDERS, Providers } from 'src/app/shared/constants/app.constants';
import { NodeType, vSphereNodeTypes } from 'src/app/views/landing/wizard/shared/constants/wizard.constants';
import { StepFormDirective } from 'src/app/views/landing/wizard/shared/step-form/step-form';
import { ValidationService } from 'src/app/views/landing/wizard/shared/validation/validation.service';
import { APIClient } from 'src/app/swagger/api-client.service';
import { Subscription } from "rxjs";
import { VsphereTkgsService } from 'src/app/shared/service/vsphere-tkgs-data.service';

@Component({
    selector: 'app-wrk-ns-step',
    templateUrl: './workload-namespace-setting.component.html',
    styleUrls: ['./workload-namespace-setting.component.scss']
})
export class WorkloadNamespaceComponent extends StepFormDirective implements OnInit {
    @Input() providerType: string;
    @Input() errorNotification: string;

    nodeTypes: Array<NodeType> = [];
    PROVIDERS: Providers = PROVIDERS;
    vSphereNodeTypes: Array<NodeType> = vSphereNodeTypes;
    nodeType: string;
    additionalNoProxyInfo: string;
    fullNoProxy: string;
    enableNetworkName = true;
    networks = [];

    subscription: Subscription;
    segmentErrorMsg = 'Provided Workload Network Segment is not found, please select again from the drop-down';
    private uploadStatus = false;

    private wrkSegment;
    private wrkGateway;
    private wrkStartIp;
    private wrkEndIp;
    private workloadSegmentName;
    disablePortGroupField: boolean = false;

    constructor(private validationService: ValidationService,
                public apiClient: APIClient,
                private  dataService: VsphereTkgsService) {

        super();
    }

    ngOnInit() {
        super.ngOnInit();
        this.formGroup.addControl('networkName',
            new FormControl('', [
                Validators.required]
        ));
        this.formGroup.addControl('newNetworkName',
            new FormControl('', []
        ));

        this.formGroup.addControl(
            'portGroup',
            new FormControl('', []));

        this.formGroup.addControl(
            'gatewayAddress',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'startAddress',
            new FormControl('', [])
        );
        this.formGroup.addControl(
            'endAddress',
            new FormControl('', [])
        );
        this.networks = this.apiClient.networks;
        this.formGroup['canMoveToNext'] = () => {
            this.modifyFieldValidators();
            if(this.formGroup.get('networkName').value === 'CREATE NEW') {
                return (this.formGroup.valid && this.apiClient.TkgWrkNwValidated);
            } else {
                return this.formGroup.valid;
            }
        };
        setTimeout(_ => {

            this.subscription = this.dataService.currentInputFileStatus.subscribe(
                (uploadStatus) => this.uploadStatus = uploadStatus);
            if (this.uploadStatus) {
                this.dataService.currentWorkloadSegmentName.subscribe(
                    (networkName) => this.workloadSegmentName = networkName);
                if (this.apiClient.tkgsWorkloadNetwork.indexOf(this.workloadSegmentName) !== -1) {
                    this.formGroup.get('networkName').setValue(this.workloadSegmentName);
                    this.modifyFieldValidators();
                } else {
                    this.formGroup.get('networkName').setValue('CREATE NEW');
                    this.formGroup.get('newNetworkName').setValue(this.workloadSegmentName);
                    this.subscription = this.dataService.currentWrkSegment.subscribe(
                        (wrkSegment) => this.wrkSegment = wrkSegment);
                    if (this.apiClient.networks.indexOf(this.wrkSegment) === -1) {
                        this.apiClient.wrkSegmentError = true;
                    } else {
                        this.formGroup.get('portGroup').setValue(this.wrkSegment);
                        this.apiClient.wrkSegmentError = false;
                    }
                    this.subscription = this.dataService.currentWrkGateway.subscribe(
                        (wrkGateway) => this.wrkGateway = wrkGateway);
                    this.formGroup.get('gatewayAddress').setValue(this.wrkGateway);
                    this.subscription = this.dataService.currentWrkStartAddress.subscribe(
                        (wrkStartIp) => this.wrkStartIp = wrkStartIp);
                    this.formGroup.get('startAddress').setValue(this.wrkStartIp);
                    this.subscription = this.dataService.currentWrkEndAddress.subscribe(
                        (wrkEndIp) => this.wrkEndIp = wrkEndIp);
                    this.formGroup.get('endAddress').setValue(this.wrkEndIp);
                }
            }
            this.validateWrkNetwork();
        });
    }

    setSavedDataAfterLoad() {
        if (this.hasSavedData()) {
        }
    }


    public validateWrkNetwork() {
        if(this.formGroup.get('networkName').value === 'CREATE NEW') {
            if (this.formGroup.get('gatewayAddress').valid &&
                this.formGroup.get('startAddress').valid &&
                this.formGroup.get('endAddress').valid) {
                const gatewayIp = this.formGroup.get('gatewayAddress').value;
                const startIp = this.formGroup.get('startAddress').value;
                const endIp = this.formGroup.get('endAddress').value;
                const block = new Netmask(gatewayIp);
                if (block.contains(startIp) && block.contains(endIp)) {
                    this.apiClient.TkgWrkNwValidated = true;
                    this.errorNotification = null;
                } else if (block.contains(startIp)) {
                    this.apiClient.TkgWrkNwValidated = false;
                    this.errorNotification = "The End IP is out of the provided subnet.";
                } else if (block.contains(endIp)) {
                    this.apiClient.TkgWrkNwValidated = false;
                    this.errorNotification = "The Start IP is out of the provided subnet.";
                } else {
                    this.apiClient.TkgWrkNwValidated = false;
                    this.errorNotification = "The Start and End IP are out of the provided subnet.";
                }
            }
        }
    }

    updateValidators() {
        if (this.apiClient.createNewSegment) {
            this.resurrectField('newNetworkName', [
                Validators.required,
                this.validationService.noWhitespaceOnEnds(),
                this.validationService.isValidClusterName()
            ], this.formGroup.value['newNetworkName']);
            this.resurrectField('portGroup', [
                Validators.required,
            ], this.formGroup.value['portGroup']);
            this.resurrectField('gatewayAddress', [
                Validators.required,
                this.validationService.isValidIpNetworkSegment(),
                this.validationService.noWhitespaceOnEnds()
            ], this.formGroup.value['gatewayAddress']);
            this.resurrectField('startAddress', [
                Validators.required,
                this.validationService.isValidIp(),
                this.validationService.noWhitespaceOnEnds()
            ], this.formGroup.value['startAddress']);
            this.resurrectField('endAddress', [
                Validators.required,
                this.validationService.isValidIp(),
                this.validationService.noWhitespaceOnEnds()
            ], this.formGroup.value['endAddress']);
        }
    }

    addNewWorkloadNetwork() {
        this.resurrectField('newNetworkName', [
            Validators.required,
            this.validationService.noWhitespaceOnEnds(),
            this.validationService.isValidClusterName()
        ], this.formGroup.value['newNetworkName']);
        this.resurrectField('portGroup', [
            Validators.required,
        ], this.formGroup.value['portGroup']);
        this.resurrectField('gatewayAddress', [
            Validators.required,
            this.validationService.isValidIpNetworkSegment(),
            this.validationService.noWhitespaceOnEnds()
        ], this.formGroup.value['gatewayAddress']);
        this.resurrectField('startAddress', [
            Validators.required,
            this.validationService.isValidIp(),
            this.validationService.noWhitespaceOnEnds()
        ], this.formGroup.value['startAddress']);
        this.resurrectField('endAddress', [
            Validators.required,
            this.validationService.isValidIp(),
            this.validationService.noWhitespaceOnEnds()
        ], this.formGroup.value['endAddress']);
    }

    useExistingWorkloadNetwork() {

        this.apiClient.createNewSegment = false;
        this.apiClient.showOld = true;


    }

    public modifyFieldValidators() {
        if(this.formGroup.get('networkName').value !== 'CREATE NEW'){
            const newNetworkFields = [
                'newNetworkName',
                'portGroup',
                'gatewayAddress',
                'startAddress',
                'endAddress',
            ];
            newNetworkFields.forEach((field) => {
                this.disarmField(field, false);
            });
        } else {
            this.resurrectField('newNetworkName', [
                Validators.required,
                this.validationService.noWhitespaceOnEnds(),
                this.validationService.isValidClusterName()
            ], this.formGroup.value['newNetworkName']);
            this.resurrectField('portGroup', [
                Validators.required,
            ], this.formGroup.value['portGroup']);
            this.resurrectField('gatewayAddress', [
                Validators.required,
                this.validationService.isValidIpNetworkSegment(),
                this.validationService.noWhitespaceOnEnds()
            ], this.formGroup.value['gatewayAddress']);
            this.resurrectField('startAddress', [
                Validators.required,
                this.validationService.isValidIp(),
                this.validationService.noWhitespaceOnEnds()
            ], this.formGroup.value['startAddress']);
            this.resurrectField('endAddress', [
                Validators.required,
                this.validationService.isValidIp(),
                this.validationService.noWhitespaceOnEnds()
            ], this.formGroup.value['endAddress']);
        }
    }
}
