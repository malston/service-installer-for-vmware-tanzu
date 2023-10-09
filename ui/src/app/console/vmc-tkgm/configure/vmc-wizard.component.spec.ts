/*
 * Copyright 2021 VMware, Inc
 * SPDX-License-Identifier: BSD-2-Clause
 */
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import Broker from 'src/app/shared/service/broker';
import { Messenger } from 'src/app/shared/service/Messenger';
import { VSphereWizardFormService } from 'src/app/shared/service/vsphere-wizard-form.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { APIClient } from 'src/app/swagger/api-client.service';
import { FormMetaDataStore } from 'src/app/views/landing/wizard/shared/FormMetaDataStore';
import { VMCWizardComponent } from 'src/app/console/vmc-tkgm/configure/vmc-wizard.component';

describe('VMCWizardComponent', () => {
    let component: VMCWizardComponent;
    let fixture: ComponentFixture<VMCWizardComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                RouterTestingModule,
                ReactiveFormsModule,
                BrowserAnimationsModule,
                RouterTestingModule.withRoutes([
                    { path: 'vmc-upload', component: VMCWizardComponent },
                ]),
                SharedModule,
            ],
            providers: [
                APIClient,
                FormBuilder,
                { provide: VSphereWizardFormService},
            ],
            schemas: [
                CUSTOM_ELEMENTS_SCHEMA,
            ],
            declarations: [
                VMCWizardComponent
            ]
        })
            .compileComponents();
    }));

    beforeEach(() => {
        Broker.messenger = new Messenger();
        const fb = new FormBuilder();
        fixture = TestBed.createComponent(VMCWizardComponent);
        component = fixture.componentInstance;
        component.form = fb.group({
            vmcProviderForm: fb.group({
            }),
            vmcMgmtNodeSettingForm: fb.group({
            }),
            vmcSharedServiceNodeSettingForm: fb.group({
            }),
            vmcWorkloadNodeSettingForm: fb.group({
            }),
            vmcAVINetworkSettingForm: fb.group({
            }),
            vmcExtensionSettingForm: fb.group({
            }),
            vmcTKGMgmtDataNWForm: fb.group({
            }),
            vmcTKGWorkloadDataNWForm: fb.group({
            }),
            vmcTanzuSaasSettingForm: fb.group({
            }),
            dnsNtpForm: fb.group({
            }),
        });
        component.clusterType = 'management';
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call getStepList in reviewConfiguration', () => {
        const getStepListSpy = spyOn(FormMetaDataStore, 'getStepList').and.callThrough();
        component.getWizardValidity();
        expect(getStepListSpy).toHaveBeenCalled();
    });

    it('getWizardValidity should return false when getStepList is empty', () => {
        expect(component['getWizardValidity']()).toBeFalsy();
    });

    it('getStepDescription should return correct description when wizard is not filled', () => {
        expect(component['getStepDescription']('provider')).toBe(
            'Validate the vSphere provider account for Tanzu Kubernetes Grid');
    });

    it('should call create vsphere api when deploying', () => {
        const apiSpy = spyOn(component['apiClient'], 'createVSphereRegionalCluster').and.callThrough();
        component.providerType = 'vmc';
        component.deploy();
        expect(apiSpy).toHaveBeenCalled();
    });
});
